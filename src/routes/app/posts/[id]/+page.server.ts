import { error } from '@sveltejs/kit';
import type { CreatorInfo } from '#lib/posts.ts';
import { getPost, PostError } from '#lib/server/posts.ts';
import { accessToken, creatorInfo, TikTokError } from '#lib/server/tiktok.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const userId = locals.user!.id;
	let post = null;
	if (params.id !== 'new') {
		try {
			post = await getPost(userId, params.id);
		} catch (e) {
			if (e instanceof PostError) error(404, 'Post not found');
			throw e;
		}
	}

	// TikTok requires showing the creator's current options before posting.
	let creator: CreatorInfo | null = null;
	let creatorError: string | null = null;
	try {
		creator = await creatorInfo(await accessToken(userId));
	} catch (e) {
		if (!(e instanceof TikTokError)) throw e;
		creatorError = e.message;
	}

	return {
		post,
		from: url.searchParams.get('from'),
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
