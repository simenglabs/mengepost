import { error } from '@sveltejs/kit';
import { openMedia, removeMedia } from '#lib/server/media.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/** Byte span of an R2 range read, clamped to the object size. */
function span(r: R2Range, size: number) {
	const offset = 'suffix' in r ? Math.max(0, size - r.suffix) : (r.offset ?? 0);
	const length = Math.min('suffix' in r ? size - offset : (r.length ?? size - offset), size - offset);
	return { offset, length };
}

/** Streams a stored media file back to its owner (editor preview). Supports one byte range (Safari video needs it). */
export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const wantsRange = event.request.headers.has('range');
	const file = await openMedia(user.id, event.params.id, event.params.mediaId, wantsRange ? event.request.headers : undefined);
	if (!file) error(404, 'Media not found');
	const headers: Record<string, string> = {
		'content-type': file.media.type,
		'accept-ranges': 'bytes',
		'cache-control': 'private, max-age=300'
	};
	if (wantsRange && file.range) {
		const { offset, length } = span(file.range, file.size);
		headers['content-range'] = `bytes ${offset}-${offset + length - 1}/${file.size}`;
		headers['content-length'] = String(length);
		return new Response(file.body, { status: 206, headers });
	}
	headers['content-length'] = String(file.size);
	return new Response(file.body, { headers });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	return handle(async () => removeMedia(user.id, event.params.id, event.params.mediaId));
};
