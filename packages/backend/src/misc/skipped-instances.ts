import { db } from '@/db/postgre.js';
import { fetchMeta } from '@/misc/fetch-meta.js';
import { Instance } from '@/models/entities/instance.js';
import { DAY } from '@/const.js';
import { Meta } from '@/models/entities/meta.js';

// Threshold from last contact after which an instance will be considered
// "dead" and should no longer get activities delivered to it.
const deadThreshold = 7 * DAY;

/**
 * Returns whether a given host matches a wildcard pattern.
 * @param host punycoded instance host
 * @param pattern wildcard pattern containing a punycoded instance host
 * @returns whether the post matches the pattern
 */
function matchHost(host: Instance['host'], pattern: string): boolean {
	// Escape all of the regex special characters. Pattern from:
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
	const escape = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp('^' + pattern.split('*').map(escape).join('.*') + '$');
	
	return re.test(host);
}

/**
 * Returns whether a specific host (punycoded) should be blocked.
 *
 * @param host punycoded instance host
 * @param meta a Promise contatining the information from the meta table (oprional)
 * @returns whether the given host should be blocked
 */
export async function shouldBlockInstance(host: string, meta: Promise<Meta> = fetchMeta()): Promise<boolean> {
	const { blockedHosts } = await meta;
	return blockedHosts.some(blockedHost => matchHost(host, blockedHost));
}

/**
 * Returns the subset of hosts which should be skipped.
 * 
 * @param hosts array of punycoded instance hosts
 * @returns array of punycoded instance hosts that should be skipped (subset of hosts parameter)
 */
export async function skippedInstances(hosts: Array<Instance['host']>): Promise<Array<Instance['host']>> {
	// Resolve the boolean promises before filtering
	const meta = fetchMeta();
	const shouldSkip = await Promise.all(hosts.map(host => shouldBlockInstance(host, meta)));
	const skipped = hosts.filter((_, i) => shouldSkip[i]);

	// if possible return early and skip accessing the database
	if (skipped.length === hosts.length) return hosts;

	const deadTime = new Date(Date.now() - deadThreshold);

	return skipped.concat(
		await db.query(
			`SELECT host FROM instance WHERE ("isSuspended" OR "latestStatus" = 410 OR "lastCommunicatedAt" < $1::date) AND host = ANY(string_to_array($2, ','))`,
			[
				deadTime.toISOString(),
				// don't check hosts again that we already know are suspended
				// also avoids adding duplicates to the list
				hosts.filter(host => !skipped.includes(host) && !host.includes(',')).join(','),
			],
		)
		.then(res => res.map(row => row.host)),
	);
}

/**
 * Returns whether a specific host (punycoded) should be skipped.
 * Convenience wrapper around skippedInstances which should only be used if there is a single host to check.
 * If you have multiple hosts, consider using skippedInstances instead to do a bulk check.
 *
 * @param host punycoded instance host
 * @returns whether the given host should be skipped
 */
export async function shouldSkipInstance(host: Instance['host']): Promise<boolean> {
	const skipped = await skippedInstances([host]);
	return skipped.length > 0;
}
