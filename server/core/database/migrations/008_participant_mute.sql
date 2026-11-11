-- Per-user "mute notifications" flag on the conversation participant row.
-- Mirrors is_archived: private to each participant, enforced server-side
-- (push notifications are suppressed for muted conversations).
ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT FALSE;
