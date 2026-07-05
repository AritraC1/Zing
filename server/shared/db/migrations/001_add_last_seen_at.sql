-- Presence tracking for chat (Day 12)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;
