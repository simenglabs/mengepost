import { error } from '@sveltejs/kit';
import type { Platform } from '#lib/platforms.ts';
import type { CreatorInfo, PostView } from '#lib/posts.ts';
import { listConnections } from '#lib/server/accounts.ts';
import { getPost, PostError } from '#lib/server/posts.ts';
import { accessToken, creatorInfo, TikTokError } from '#lib/server/tiktok.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const userId = locals.user!.id;
	let post: PostView | null = null;
	if (params.id !== 'new') {
		try {
			post = await getPost(userId, params.id);
		} catch (e) {
			if (e instanceof PostError) error(404, 'Post not found');
			throw e;
		}
	}

	const all = await listConnections(userId);
	const connections: Partial<Record<Platform, { display_name: string; avatar_url: string }>> = {};
	for (const [platform, c] of Object.entries(all) as [Platform, (typeof all)[Platform]][])
		if (c) connections[platform] = { display_name: c.display_name, avatar_url: c.avatar_url };

	// TikTok requires showing the creator's current options before posting.
	// Only asked when TikTok is connected, so the editor still opens without it.
	let creator: CreatorInfo | null = null;
	let creatorError: string | null = null;
	if (connections.tiktok) {
		try {
			creator = await creatorInfo(await accessToken(userId));
		} catch (e) {
			if (!(e instanceof TikTokError)) throw e;
			creatorError = e.message;
		}
	}

	return {
		post,
		from: url.searchParams.get('from'),
		connections,
		creator,
		creatorError,
		date: url.searchParams.get('date'),
		initialStatus:
			url.searchParams.get('status') === 'idea'
				? 'idea'
				: url.searchParams.has('schedule')
					? 'scheduled'
					: null,
	};
};
