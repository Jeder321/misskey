import { Notes, Channels } from '@/models/index.js';
import { activeUsersChart } from '@/services/chart/index.js';
import define from '../../define.js';
import { ApiError } from '../../error.js';
import { makePaginationQuery } from '../../common/make-pagination-query.js';

export const meta = {
	tags: ['notes', 'channels'],

	requireCredential: false,
	requireCredentialPrivateMode: true,

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Note',
		},
	},

	errors: ['NO_SUCH_CHANNEL'],
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		channelId: { type: 'string', format: 'misskey:id' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		sinceDate: { type: 'integer' },
		untilDate: { type: 'integer' },
	},
	required: ['channelId'],
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async (ps, user) => {
	const channel = await Channels.findOneBy({
		id: ps.channelId,
	});

	if (channel == null) throw new ApiError('NO_SUCH_CHANNEL');

	//#region Construct query
	const query = makePaginationQuery(Notes.createQueryBuilder('note'), ps.sinceId, ps.untilId, ps.sinceDate, ps.untilDate)
		.andWhere('note.channelId = :channelId', { channelId: channel.id })
		.innerJoinAndSelect('note.user', 'user')
		.leftJoinAndSelect('user.avatar', 'avatar')
		.leftJoinAndSelect('user.banner', 'banner')
		.leftJoinAndSelect('note.reply', 'reply')
		.leftJoinAndSelect('note.renote', 'renote')
		.leftJoinAndSelect('reply.user', 'replyUser')
		.leftJoinAndSelect('replyUser.avatar', 'replyUserAvatar')
		.leftJoinAndSelect('replyUser.banner', 'replyUserBanner')
		.leftJoinAndSelect('renote.user', 'renoteUser')
		.leftJoinAndSelect('renoteUser.avatar', 'renoteUserAvatar')
		.leftJoinAndSelect('renoteUser.banner', 'renoteUserBanner')
		.leftJoinAndSelect('note.channel', 'channel');
	//#endregion

	const timeline = await query.take(ps.limit).getMany();

	if (user) activeUsersChart.read(user);

	return await Notes.packMany(timeline, user);
});
