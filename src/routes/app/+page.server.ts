import { listPosts } from '#lib/server/posts.ts';
import type { PageServerLoad } from './$types';

const WEEK = 7 * 86_400_000;

export const load: PageServerLoad = async ({ locals }) => {
	// ponytail: all of a user's posts in one query; aggregate in JS. Paginate/aggregate in SQL if users reach thousands of posts.
	const posts = await listPosts(locals.user!.id);
	const now = Date.now();
	const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
	const count = (pred: (p: (typeof posts)[number]) => boolean) => posts.filter(pred).length;

	const startOfWeek = (() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
		return d.getTime();
	})();
	const weeks = Array.from({ length: 8 }, (_, i) => {
		const from = startOfWeek - (7 - i) * WEEK;
		return { from, count: count((p) => !!p.published_at && p.published_at >= from && p.published_at < from + WEEK) };
	});

	return {
		stats: {
			ideas: count((p) => p.status === 'idea'),
			drafts: count((p) => p.status === 'draft'),
			scheduled: count((p) => p.status === 'scheduled'),
			publishedMonth: count((p) => p.status === 'published' && (p.published_at ?? 0) >= monthStart),
			publishedTotal: count((p) => p.status === 'published')
		},
		upcoming: posts
			.filter((p) => p.status === 'scheduled' && (p.scheduled_at ?? 0) >= now - 60_000)
			.sort((a, b) => a.scheduled_at! - b.scheduled_at!)
			.slice(0, 4),
		attention: posts.filter((p) => p.status === 'failed' || (p.status === 'draft' && p.media.length === 0)).slice(0, 4),
		recent: posts.slice(0, 5),
		weeks
	};
};
