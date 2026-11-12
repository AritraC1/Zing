CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID REFERENCES conversations(id),
    user_id UUID REFERENCES users(id),
    -- Group chats only: 'admin' (creator) or 'member'.
    role TEXT NOT NULL DEFAULT 'member',
    is_archived BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);