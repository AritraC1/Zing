CREATE TYPE message_type AS ENUM ('text','media', 'voice_note', 'call', 'system');

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_msg_id UUID NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    sequence_no BIGINT NOT NULL, -- Order of message
    msg_type message_type,
    media_id UUID REFERENCES media(id),
    forwarded_from_id UUID REFERENCES messages(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (client_msg_id, sender_id) -- scoped per sender
    UNIQUE (conversation_id, sequence_no)
);