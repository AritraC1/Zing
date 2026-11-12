CREATE TYPE device_type AS ENUM ('web','ios','android','desktop');

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type device_type NOT NULL,
    identity_public_key TEXT,
    signed_prekey_id INTEGER,
    signed_prekey_public TEXT,
    signed_prekey_signature TEXT,
    push_token TEXT,
    push_type TEXT,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE
);