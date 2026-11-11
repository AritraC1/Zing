-- Message reactions, replies/quoting and starred messages
--
-- 1) messages gains reply_to_id: a self-reference to the message being
--    quoted. Replies render the quoted bubble above the reply.
--
-- 2) message_reactions stores emoji reactions (message_id, user_id,
--    emoji). A user may react with several different emoji, but the
--    same emoji twice is one row (idempotent).
--
-- 3) starred_messages is a per-user bookmark list — independent of the
--    conversation, one row per (user, message).

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON message_reactions (message_id);

CREATE TABLE IF NOT EXISTS starred_messages (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_messages_message
  ON starred_messages (message_id);
