import { error } from '@sveltejs/kit';
import { addMedia, reorderMedia } from '#lib/server/media.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import { PostError } from '#lib/server/posts.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

function fileName(raw: string | null) {
	try {
		return decodeURIComponent(raw ?? '') || 'file';
	} catch {
		return 'file';
	}
}

/** Upload: raw file bytes as the body, file name in `x-file-name`, optional video length in `x-duration-ms`. */
export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { request, params } = event;
	const type = request.headers.get('content-type') ?? '';
	const size = Number(request.headers.get('content-length'));
	if (!size || !request.body) error(411, 'Missing file.');
	const rawDuration = request.headers.get('x-duration-ms');
	const duration = rawDuration ? Number(rawDuration) : null;
	return handle(async () =>
		addMedia(user.id, params.id, request.body!, {
			name: fileName(request.headers.get('x-file-name')),
			type,
			size,
			duration_ms: duration != null && Number.isFinite(duration) ? duration : null,
		}),
	);
};

/** Reorder: `{ order: string[] }` with every media id of the post. */
export const PATCH: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = (await event.request.json().catch(() => null)) as { order?: unknown } | null;
	return handle(async () => {
		const order = body?.order;
		if (!Array.isArray(order) || !order.every((id) => typeof id === 'string')) throw new PostError('Invalid media order.');
		return reorderMedia(user.id, event.params.id, order);
	});
};
