CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);