import { getPost, PostError } from '#lib/server/posts.ts';
import { claimLost, publishPost } from '#lib/server/publish.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/** "Post now". */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	return handle(async () => {
		const post = await getPost(user.id, event.params.id);
		if (post.status === 'publishing' || post.targets.some((t) => t.status === 'publishing')) throw new PostError('Already publishing.', 409);
		if (post.targets.some((t) => t.status === 'published' || t.status === 'unknown'))
			throw new PostError('Use retry for the failed platforms.', 409);
		if (!(await publishPost(post, ['idea', 'draft', 'scheduled', 'failed']))) throw await claimLost(user.id, post.id);
		return getPost(user.id, post.id);
	});
};
