-- Message editing/deletion and user blocking
--
-- 1) messages gains soft-delete and edit metadata:
--    is_deleted/deleted_at mark a message as removed for everyone
--    (content is cleared so history stays truthful); edited_at marks
--    an edited text message.
--
-- 2) blocked_users records 1:1 contact blocks. A block in either
--    direction prevents message delivery between the pair.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker
  ON blocked_users (blocker_id);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked
  ON blocked_users (blocked_id);
