import { listPosts } from '#lib/server/posts.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const posts = await listPosts(locals.user!.id);
	// Only posts with a date belong on the calendar.
	return { posts: posts.filter((p) => p.scheduled_at || p.published_at) };
};
