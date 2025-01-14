import { ClipNotes, Clips, Notes } from '@/models/index.js';
import define from '../../define.js';
import { makePaginationQuery } from '../../common/make-pagination-query.js';
import { generateVisibilityQuery } from '../../common/generate-visibility-query.js';
import { generateMutedUserQuery } from '../../common/generate-muted-user-query.js';
import { ApiError } from '../../error.js';
import { generateBlockedUserQuery } from '../../common/generate-block-query.js';

export const meta = {
	tags: ['account', 'notes', 'clips'],

	requireCredential: false,
	requireCredentialPrivateMode: true,

	kind: 'read:account',

	errors: ['NO_SUCH_CLIP'],

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Note',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		clipId: { type: 'string', format: 'misskey:id' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
	},
	required: ['clipId'],
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async (ps, user) => {
	const clip = await Clips.findOneBy({
		id: ps.clipId,
	});

	if (clip == null) throw new ApiError('NO_SUCH_CLIP');

	if (!clip.isPublic && (user == null || (clip.userId !== user.id))) {
		throw new ApiError('NO_SUCH_CLIP');
	}

	const query = makePaginationQuery(Notes.createQueryBuilder('note'), ps.sinceId, ps.untilId)
		.innerJoin(ClipNotes.metadata.targetName, 'clipNote', 'clipNote.noteId = note.id')
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
		.andWhere('clipNote.clipId = :clipId', { clipId: clip.id });

	if (user) {
		generateVisibilityQuery(query, user);
		generateMutedUserQuery(query, user);
		generateBlockedUserQuery(query, user);
	}

	const notes = await query
		.take(ps.limit)
		.getMany();

	return await Notes.packMany(notes, user);
});
