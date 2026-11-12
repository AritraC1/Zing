-- Per-user "delete chat" (delete for me). A NULL deleted_at means the
-- chat is visible in this participant's list; a timestamp hides it.
-- Mirrors is_archived / is_muted: private to each participant, enforced
-- server-side (getUserConversations filters deleted rows out).
-- The flag is cleared when a new message arrives in the conversation,
-- so a deleted chat reappears like WhatsApp does.
ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
