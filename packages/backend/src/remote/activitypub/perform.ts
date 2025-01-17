import { DAY } from '@/const.js';
import { CacheableRemoteUser } from '@/models/entities/user.js';
import { IObject } from './type.js';
import { performActivity } from './kernel/index.js';
import { updatePerson } from './models/person.js';

export default async (actor: CacheableRemoteUser, activity: IObject): Promise<void> => {
	await performActivity(actor, activity);

	// And while I'm at it, I'll update the remote user information if it's out of date.
	if (actor.uri) {
		if (actor.lastFetchedAt == null || Date.now() - actor.lastFetchedAt.getTime() > DAY) {
			setImmediate(() => {
				updatePerson(actor.uri!);
			});
		}
	}
};
