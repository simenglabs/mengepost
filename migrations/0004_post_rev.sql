-- A random token replaced on every guarded post write, so a write only applies to the exact version it read
-- (timestamps can collide within a millisecond).
ALTER TABLE posts ADD COLUMN rev TEXT NOT NULL DEFAULT '';
UPDATE posts SET rev = lower(hex(randomblob(16)));
