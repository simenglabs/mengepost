import { createPost, parsePatch } from '#lib/server/posts.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await event.request.json().catch(() => null);
	return handle(async () => createPost(user.id, parsePatch(body)));
};
