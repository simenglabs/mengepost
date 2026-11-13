// Shared (client + server) post types and labels.

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
	privacy: Privacy | null;
	allow_comment: number;
	allow_duet: number;
	allow_stitch: number;
	brand_organic: number;
	brand_content: number;
	video_key: string | null;
	video_name: string | null;
	video_size: number | null;
	video_type: string | null;
	scheduled_at: number | null;
	published_at: number | null;
	publish_id: string | null;
	fail_reason: string | null;
	created_at: number;
	updated_at: number;
};

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
