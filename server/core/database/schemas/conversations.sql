CREATE TYPE conversation_type AS ENUM ('direct', 'group');

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY,
    chat_type conversation_type,
    -- Group chats: display name, avatar and creator. NULL for direct chats.
    name TEXT,
    avatar_media_id UUID REFERENCES media(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);