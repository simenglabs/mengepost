import { PLATFORMS, type Platform } from '#lib/platforms.ts';
import { PostError } from '#lib/server/posts.ts';
import { retryTargets } from '#lib/server/publish.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/** Sends failed platforms again: `{ platforms?: Platform[] }`, default every failed platform. */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = (await event.request.json().catch(() => ({}))) as { platforms?: unknown } | null;
	return handle(async () => {
		const platforms = body?.platforms;
		if (platforms !== undefined && (!Array.isArray(platforms) || !platforms.every((p) => PLATFORMS.includes(p))))
			throw new PostError('Invalid platforms');
		return retryTargets(user.id, event.params.id, platforms as Platform[] | undefined);
	});
};
