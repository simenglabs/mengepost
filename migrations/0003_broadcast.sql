-- Broadcast: media and per-platform targets split out of posts; TikTok accounts move into social_accounts.
CREATE TABLE post_media (
	id TEXT PRIMARY KEY,
	post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	position INTEGER NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
	r2_key TEXT NOT NULL,
	name TEXT NOT NULL,
	size INTEGER NOT NULL,
	type TEXT NOT NULL,
	duration_ms INTEGER,
	created_at INTEGER NOT NULL
);
CREATE INDEX post_media_post ON post_media(post_id, position);

CREATE TABLE post_targets (
	post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'threads', 'x')),
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'unknown')),
	caption TEXT,
	settings TEXT NOT NULL DEFAULT '{}',
	external_id TEXT,
	external_url TEXT,
	fail_reason TEXT,
	started_at INTEGER,
	published_at INTEGER,
	updated_at INTEGER NOT NULL,
	PRIMARY KEY (post_id, platform)
);
CREATE INDEX post_targets_status ON post_targets(status, started_at);

INSERT INTO social_accounts (user_id, platform, external_id, display_name, avatar_url, token, access_expires_at, refresh_expires_at, connected_at)
SELECT user_id, 'tiktok', open_id, display_name, avatar_url, token, access_expires_at, refresh_expires_at, connected_at FROM tiktok_accounts;

INSERT INTO post_media (id, post_id, position, kind, r2_key, name, size, type, duration_ms, created_at)
SELECT lower(hex(randomblob(16))), id, 0, 'video', video_key, COALESCE(video_name, ''), COALESCE(video_size, 0), COALESCE(video_type, 'video/mp4'), NULL, updated_at
FROM posts WHERE video_key IS NOT NULL;

INSERT INTO post_targets (post_id, platform, status, caption, settings, external_id, fail_reason, started_at, published_at, updated_at)
SELECT id, 'tiktok',
	CASE status WHEN 'publishing' THEN 'publishing' WHEN 'published' THEN 'published' WHEN 'failed' THEN 'failed' ELSE 'pending' END,
	NULL,
	json_object(
		'privacy', privacy,
		'allow_comment', json(CASE WHEN allow_comment THEN 'true' ELSE 'false' END),
		'allow_duet', json(CASE WHEN allow_duet THEN 'true' ELSE 'false' END),
		'allow_stitch', json(CASE WHEN allow_stitch THEN 'true' ELSE 'false' END),
		'brand_organic', json(CASE WHEN brand_organic THEN 'true' ELSE 'false' END),
		'brand_content', json(CASE WHEN brand_content THEN 'true' ELSE 'false' END)
	),
	CASE WHEN status IN ('publishing', 'published') THEN publish_id END,
	CASE WHEN status = 'failed' THEN fail_reason END,
	CASE WHEN status = 'publishing' THEN updated_at END,
	CASE WHEN status = 'published' THEN published_at END,
	updated_at
FROM posts;

ALTER TABLE posts DROP COLUMN privacy;
ALTER TABLE posts DROP COLUMN allow_comment;
ALTER TABLE posts DROP COLUMN allow_duet;
ALTER TABLE posts DROP COLUMN allow_stitch;
ALTER TABLE posts DROP COLUMN brand_organic;
ALTER TABLE posts DROP COLUMN brand_content;
ALTER TABLE posts DROP COLUMN video_key;
ALTER TABLE posts DROP COLUMN video_name;
ALTER TABLE posts DROP COLUMN video_size;
ALTER TABLE posts DROP COLUMN video_type;
ALTER TABLE posts DROP COLUMN publish_id;
ALTER TABLE posts DROP COLUMN fail_reason;

DROP TABLE tiktok_accounts;
