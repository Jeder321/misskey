import { DAY } from '@/const.js';
import { GalleryPosts } from '@/models/index.js';
import define from '../../define.js';

export const meta = {
	tags: ['gallery'],

	requireCredential: false,
	requireCredentialPrivateMode: true,

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'GalleryPost',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async (ps, me) => {
	const query = GalleryPosts.createQueryBuilder('post')
		.andWhere('post.createdAt > :date', { date: new Date(Date.now() - 3 * DAY) })
		.andWhere('post.likedCount > 0')
		.orderBy('post.likedCount', 'DESC');

	const posts = await query.take(10).getMany();

	return await GalleryPosts.packMany(posts, me);
});
