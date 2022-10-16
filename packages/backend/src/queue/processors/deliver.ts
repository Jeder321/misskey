import { URL } from 'node:url';
import Bull from 'bull';
import request from '@/remote/activitypub/request.js';
import { registerOrFetchInstanceDoc } from '@/services/register-or-fetch-instance-doc.js';
import Logger from '@/services/logger.js';
import { Instances } from '@/models/index.js';
import { apRequestChart, federationChart, instanceChart } from '@/services/chart/index.js';
import { fetchInstanceMetadata } from '@/services/fetch-instance-metadata.js';
import { fetchMeta } from '@/misc/fetch-meta.js';
import { toPuny } from '@/misc/convert-host.js';
import { Cache } from '@/misc/cache.js';
import { Instance } from '@/models/entities/instance.js';
import { StatusError } from '@/misc/fetch.js';
import { DeliverJobData } from '@/queue/types.js';
import { LessThan } from 'typeorm';
import { DAY } from '@/const.js';

const logger = new Logger('deliver');

let latest: string | null = null;

const deadThreshold = 30 * DAY;

export default async (job: Bull.Job<DeliverJobData>) => {
	const { host } = new URL(job.data.to);
	const puny = toPuny(host);

	// ブロックしてたら中断
	const meta = await fetchMeta();
	if (meta.blockedHosts.includes(puny)) {
		return 'skip (blocked)';
	}

	if (meta.privateMode && !meta.allowedHosts.includes(toPuny(host))) {
		return 'skip (not allowed)';
	}

	const deadTime = new Date(Date.now() - deadThreshold);
	const isSuspendedOrDead = await Instances.countBy([
		{ host: puny, isSuspended: true },
		{ host: puny, lastCommunicatedAt: LessThan(deadTime) },
	]);
	if (isSuspendedOrDead) {
		return 'skip (suspended or dead)';
	}

	try {
		if (latest !== (latest = JSON.stringify(job.data.content, null, 2))) {
			logger.debug(`delivering ${latest}`);
		}

		await request(job.data.user, job.data.to, job.data.content);

		// Update stats
		registerOrFetchInstanceDoc(host).then(i => {
			Instances.update(i.id, {
				latestRequestSentAt: new Date(),
				latestStatus: 200,
				lastCommunicatedAt: new Date(),
				isNotResponding: false,
			});

			fetchInstanceMetadata(i);

			instanceChart.requestSent(i.host, true);
			apRequestChart.deliverSucc();
			federationChart.deliverd(i.host, true);
		});

		return 'Success';
	} catch (res) {
		// Update stats
		registerOrFetchInstanceDoc(host).then(i => {
			Instances.update(i.id, {
				latestRequestSentAt: new Date(),
				latestStatus: res instanceof StatusError ? res.statusCode : null,
				isNotResponding: true,
			});

			instanceChart.requestSent(i.host, false);
			apRequestChart.deliverFail();
			federationChart.deliverd(i.host, false);
		});

		if (res instanceof StatusError) {
			// 4xx
			if (res.isClientError) {
				// HTTPステータスコード4xxはクライアントエラーであり、それはつまり
				// 何回再送しても成功することはないということなのでエラーにはしないでおく
				return `${res.statusCode} ${res.statusMessage}`;
			}

			// 5xx etc.
			throw new Error(`${res.statusCode} ${res.statusMessage}`);
		} else {
			// DNS error, socket error, timeout ...
			throw res;
		}
	}
};
