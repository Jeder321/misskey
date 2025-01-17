import { CacheableRemoteUser } from '@/models/entities/user.js';
import { getApType, IUpdate, isActor } from '@/remote/activitypub/type.js';
import { apLogger } from '@/remote/activitypub/logger.js';
import { updateQuestion } from '@/remote/activitypub/models/question.js';
import Resolver from '@/remote/activitypub/resolver.js';
import { updatePerson } from '@/remote/activitypub/models/person.js';

/**
 * Updateアクティビティを捌きます
 */
export default async (actor: CacheableRemoteUser, activity: IUpdate): Promise<string> => {
	if ('actor' in activity && actor.uri !== activity.actor) {
		return 'skip: invalid actor';
	}

	apLogger.debug('Update');

	const resolver = new Resolver();

	const object = await resolver.resolve(activity.object).catch(e => {
		apLogger.error(`Resolution failed: ${e}`);
		throw e;
	});

	if (isActor(object)) {
		await updatePerson(actor.uri!, resolver, object);
		return 'ok: Person updated';
	} else if (getApType(object) === 'Question') {
		await updateQuestion(object, resolver).catch(e => console.log(e));
		return 'ok: Question updated';
	} else {
		return `skip: Unknown type: ${getApType(object)}`;
	}
};
