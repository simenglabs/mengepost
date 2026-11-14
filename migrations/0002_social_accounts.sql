-- Connected social accounts for every platform except TikTok (which still lives in tiktok_accounts).
-- One account per platform per app user. `token` is AES-GCM encrypted JSON {access_token, refresh_token}.
-- refresh_expires_at is NULL when the platform's refresh token has no fixed expiry.
CREATE TABLE social_accounts (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'threads', 'x')),
	external_id TEXT NOT NULL,
	display_name TEXT NOT NULL DEFAULT '',
	avatar_url TEXT NOT NULL DEFAULT '',
	token TEXT NOT NULL,
	access_expires_at INTEGER NOT NULL,
	refresh_expires_at INTEGER,
	connected_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, platform)
);
