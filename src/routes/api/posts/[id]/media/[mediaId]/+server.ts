import { error } from '@sveltejs/kit';
import { openMedia, removeMedia } from '#lib/server/media.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/** Streams a stored media file back to its owner (editor preview). */
export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const file = await openMedia(user.id, event.params.id, event.params.mediaId);
	if (!file) error(404, 'Media not found');
	return new Response(file.body, {
		headers: {
			'content-type': file.media.type,
			'content-length': String(file.size),
			'cache-control': 'private, max-age=300'
		}
	});
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	return handle(async () => removeMedia(user.id, event.params.id, event.params.mediaId));
};
