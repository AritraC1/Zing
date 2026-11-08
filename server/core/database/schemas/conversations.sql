CREATE TYPE conversation_type AS ENUM ('direct', 'group');

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY,
    chat_type conversation_type,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);