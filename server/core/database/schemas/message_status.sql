CREATE TYPE message_delivery_status AS ENUM ('sent', 'delivered', 'seen');

CREATE TABLE IF NOT EXISTS message_status(
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    msg_status message_delivery_status NOT NULL,

    delivered_at TIMESTAMPTZ,
    seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (message_id, user_id)
);