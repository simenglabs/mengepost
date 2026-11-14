// Shared (client + server) post types and labels.
import type { Platform } from './platforms.ts';
import type { TargetStatus, TargetSettings } from './targets.ts';

export type Privacy =
	| 'PUBLIC_TO_EVERYONE'
	| 'MUTUAL_FOLLOW_FRIENDS'
	| 'FOLLOWER_OF_CREATOR'
	| 'SELF_ONLY';
export type Status =
	| 'idea'
	| 'draft'
	| 'scheduled'
	| 'publishing'
	| 'published'
	| 'failed';

export type Post = {
	id: string;
	user_id: string;
	caption: string;
	status: Status;
	scheduled_at: number | null;
	published_at: number | null;
	created_at: number;
	updated_at: number;
};

export type Media = {
	id: string;
	post_id: string;
	position: number;
	kind: 'image' | 'video';
	name: string;
	size: number;
	type: string;
	duration_ms: number | null;
};

export type Target = {
	post_id: string;
	platform: Platform;
	status: TargetStatus;
	caption: string | null;
	settings: TargetSettings;
	external_id: string | null;
	external_url: string | null;
	fail_reason: string | null;
	started_at: number | null;
	published_at: number | null;
	updated_at: number;
};

export type PostView = Post & { media: Media[]; targets: Target[] };

/** Short progress line for a post card, or '' when not relevant. */
export function postSummary(v: PostView): string {
	if (v.status !== 'publishing' && v.status !== 'published' && v.status !== 'failed') return '';
	const unknown = v.targets.filter((t) => t.status === 'unknown').length;
	if (unknown > 0) return `${unknown} needs checking`;
	const published = v.targets.filter((t) => t.status === 'published').length;
	return `${published} of ${v.targets.length} published`;
}

export type CreatorInfo = {
	creator_avatar_url: string;
	creator_username: string;
	creator_nickname: string;
	privacy_level_options: Privacy[];
	comment_disabled: boolean;
	duet_disabled: boolean;
	stitch_disabled: boolean;
	max_video_post_duration_sec: number;
};

export const PRIVACY: Privacy[] = [
	'PUBLIC_TO_EVERYONE',
	'MUTUAL_FOLLOW_FRIENDS',
	'FOLLOWER_OF_CREATOR',
	'SELF_ONLY',
];

export const privacyLabel: Record<Privacy, string> = {
	PUBLIC_TO_EVERYONE: 'Everyone',
	MUTUAL_FOLLOW_FRIENDS: 'Friends',
	FOLLOWER_OF_CREATOR: 'Followers',
	SELF_ONLY: 'Only me',
};

export const statusLabel: Record<Status, string> = {
	idea: 'Idea',
	draft: 'Draft',
	scheduled: 'Scheduled',
	publishing: 'Publishing',
	published: 'Published',
	failed: 'Failed',
};

/** Kanban columns; each column shows one or more statuses. */
export const COLUMNS: {
	key: 'idea' | 'draft' | 'scheduled' | 'published';
	title: string;
	statuses: Status[];
}[] = [
	{ key: 'idea', title: 'Ideas', statuses: ['idea'] },
	{ key: 'draft', title: 'Drafts', statuses: ['draft', 'failed'] },
	{
		key: 'scheduled',
		title: 'Scheduled',
		statuses: ['scheduled', 'publishing'],
	},
	{ key: 'published', title: 'Published', statuses: ['published'] },
];

export const LOCKED: Status[] = ['publishing', 'published'];

export const title = (p: Pick<Post, 'caption'>) =>
	p.caption.split('\n')[0].slice(0, 80) || 'Untitled post';
