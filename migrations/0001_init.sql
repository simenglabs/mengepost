CREATE TABLE users (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
	created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- One TikTok account per app user. `token` is AES-GCM encrypted JSON {access_token, refresh_token}.
CREATE TABLE tiktok_accounts (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	open_id TEXT NOT NULL,
	display_name TEXT NOT NULL DEFAULT '',
	avatar_url TEXT NOT NULL DEFAULT '',
	token TEXT NOT NULL,
	access_expires_at INTEGER NOT NULL,
	refresh_expires_at INTEGER NOT NULL,
	connected_at INTEGER NOT NULL
);

CREATE TABLE posts (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	caption TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'idea'
		CHECK (status IN ('idea', 'draft', 'scheduled', 'publishing', 'published', 'failed')),
	privacy TEXT,
	allow_comment INTEGER NOT NULL DEFAULT 0,
	allow_duet INTEGER NOT NULL DEFAULT 0,
	allow_stitch INTEGER NOT NULL DEFAULT 0,
	brand_organic INTEGER NOT NULL DEFAULT 0,
	brand_content INTEGER NOT NULL DEFAULT 0,
	video_key TEXT,
	video_name TEXT,
	video_size INTEGER,
	video_type TEXT,
	scheduled_at INTEGER,
	published_at INTEGER,
	publish_id TEXT,
	fail_reason TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
CREATE INDEX posts_user_status ON posts(user_id, status);
CREATE INDEX posts_due ON posts(status, scheduled_at);
