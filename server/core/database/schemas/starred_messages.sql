-- Per-user starred messages ("starred" bookmark list, independent of
-- conversations).

CREATE TABLE IF NOT EXISTS starred_messages (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_messages_message
    ON starred_messages (message_id);
