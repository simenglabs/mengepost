import { PLATFORMS, type Platform } from '#lib/platforms.ts';
import { PostError } from '#lib/server/posts.ts';
import { resolveUnknown } from '#lib/server/publish.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/** The user checked a platform that needed checking: `{ outcome: 'published' | 'retry', url?: string }`. */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = (await event.request.json().catch(() => null)) as { outcome?: unknown; url?: unknown } | null;
	return handle(async () => {
		const platform = event.params.platform as Platform;
		if (!PLATFORMS.includes(platform)) throw new PostError('Platform not found', 404);
		const outcome = body?.outcome;
		if (outcome !== 'published' && outcome !== 'retry') throw new PostError('Invalid outcome');
		const url = body?.url ?? null;
		if (url !== null && typeof url !== 'string') throw new PostError('Invalid link');
		return resolveUnknown(user.id, event.params.id, platform, outcome, url);
	});
};
