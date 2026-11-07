CREATE INDEX IF NOT EXISTS idx_messages_conversation_sequence
  ON messages (conversation_id, sequence_no DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
  ON conversation_participants (user_id);

CREATE INDEX IF NOT EXISTS idx_message_status_message_user
  ON message_status (message_id, user_id);
