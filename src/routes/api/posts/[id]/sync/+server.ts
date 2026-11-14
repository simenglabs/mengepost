import { getPost } from '#lib/server/posts.ts';
import { syncPost } from '#lib/server/publish.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/** Checks platforms that are still processing. */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	return handle(async () => {
		const post = await getPost(user.id, event.params.id);
		await syncPost(post);
		return getPost(user.id, post.id);
	});
};
