import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { attachVideo, getPost } from '#lib/server/posts.ts';
import { handle, requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

const TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX = 95 * 1024 * 1024; // Workers request body limit is 100MB

/** Upload: raw video bytes as the body, file name in `x-file-name`. */
export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { request, params } = event;
	const type = request.headers.get('content-type') ?? '';
	const size = Number(request.headers.get('content-length'));
	if (!TYPES.includes(type)) error(415, 'Use an MP4, MOV or WebM video.');
	if (!size || size > MAX || !request.body) error(413, 'Video must be under 95MB.');
	const name = decodeURIComponent(request.headers.get('x-file-name') ?? 'video');
	return handle(async () => attachVideo(user.id, params.id, request.body!, { name, type, size }));
};

/** Streams the stored video back to its owner (editor preview). */
export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const post = await getPost(user.id, event.params.id).catch(() => null);
	if (!post?.video_key) error(404, 'No video');
	const obj = await env.MEDIA.get(post.video_key);
	if (!obj) error(404, 'No video');
	return new Response(obj.body, {
		headers: { 'content-type': post.video_type ?? 'video/mp4', 'content-length': String(obj.size), 'cache-control': 'private, max-age=300' }
	});
};
