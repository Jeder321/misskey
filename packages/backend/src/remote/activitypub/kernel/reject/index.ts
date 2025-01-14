import { CacheableRemoteUser } from '@/models/entities/user.js';
import { apLogger } from '../../logger.js';
import { IReject, isFollow, getApType } from '../../type.js';
import Resolver from '../../resolver.js';
import rejectFollow from './follow.js';

export default async (actor: CacheableRemoteUser, activity: IReject): Promise<string> => {
	const uri = activity.id || activity;

	apLogger.info(`Reject: ${uri}`);

	const resolver = new Resolver();

	const object = await resolver.resolve(activity.object).catch(e => {
		apLogger.error(`Resolution failed: ${e}`);
		throw e;
	});

	if (isFollow(object)) return await rejectFollow(actor, object);

	return `skip: Unknown Reject type: ${getApType(object)}`;
};
