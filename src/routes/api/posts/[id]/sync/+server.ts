import { getPost, syncStatus } from '#lib/server/posts.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/** Polls TikTok for a post that is publishing (UI calls this instead of waiting for the cron). */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	return handle(async () => {
		await syncStatus(await getPost(user.id, event.params.id));
		return getPost(user.id, event.params.id);
	});
};
