import { listPosts } from '#lib/server/posts.ts';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => ({
	posts: await listPosts(locals.user!.id),
});
