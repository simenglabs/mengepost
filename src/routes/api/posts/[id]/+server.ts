import { deletePost, parsePatch, updatePost } from '#lib/server/posts.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

export const PATCH: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await event.request.json().catch(() => null);
	return handle(async () => updatePost(user.id, event.params.id, parsePatch(body)));
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	return handle(async () => {
		await deletePost(user.id, event.params.id);
		return { ok: true };
	});
};
