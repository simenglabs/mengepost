import { getPost, PostError, publishPost } from '#lib/server/posts.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/** "Post now". */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	return handle(async () => {
		const post = await getPost(user.id, event.params.id);
		if (!(await publishPost(post, ['idea', 'draft', 'scheduled', 'failed']))) throw new PostError('Already publishing.', 409);
		return getPost(user.id, post.id);
	});
};
