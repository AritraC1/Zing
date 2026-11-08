-- Convert all naive (timestamp without time zone) columns to TIMESTAMPTZ.
--
-- Naive timestamps are returned by the API with no timezone marker, so
-- browsers parse them as *local* time instead of UTC — every chat time,
-- last-seen and separator rendered on the client was shifted by the
-- server/user timezone offset.
--
-- Existing rows hold naive values written by NOW() under a UTC server
-- clock (Docker default), so we pin the session timezone to UTC during
-- the conversion to keep stored values meaning the same instant.

SET LOCAL timezone = 'UTC';

ALTER TABLE users
  ALTER COLUMN last_seen_at TYPE timestamptz,
  ALTER COLUMN created_at TYPE timestamptz,
  ALTER COLUMN updated_at TYPE timestamptz;

ALTER TABLE conversations
  ALTER COLUMN created_at TYPE timestamptz,
  ALTER COLUMN last_message_at TYPE timestamptz;

ALTER TABLE conversation_participants
  ALTER COLUMN joined_at TYPE timestamptz;

ALTER TABLE messages
  ALTER COLUMN created_at TYPE timestamptz;

ALTER TABLE message_status
  ALTER COLUMN delivered_at TYPE timestamptz,
  ALTER COLUMN seen_at TYPE timestamptz,
  ALTER COLUMN created_at TYPE timestamptz;

ALTER TABLE devices
  ALTER COLUMN last_seen_at TYPE timestamptz,
  ALTER COLUMN created_at TYPE timestamptz;

ALTER TABLE media
  ALTER COLUMN created_at TYPE timestamptz;

ALTER TABLE device_prekeys
  ALTER COLUMN created_at TYPE timestamptz;
