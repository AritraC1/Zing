CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY,
    uploader_id UUID,
    storage_key TEXT,
    mime_type VARCHAR(100),
    size_byte BIGINT,
    checksum_sha256 TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);