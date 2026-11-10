-- 005: Call duration
--
-- Adds duration_seconds to calls and repairs historical rows whose sockets
-- never delivered a clean hangup (e.g. server restart mid-call), which left
-- ended_at NULL so no duration could ever be computed for history entries.

ALTER TABLE calls
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Orphaned calls: never cleanly ended and stale for > 5 minutes.
-- Best-effort: stamp ended_at at the last known update time.
UPDATE calls
SET ended_at = updated_at
WHERE ended_at IS NULL
  AND updated_at < NOW() - INTERVAL '5 minutes';

-- Orphaned rows still ringing after the window above never got answered.
-- Anything answered but orphaned keeps the 'answered' status (it rang through).
UPDATE calls
SET status = 'missed'
WHERE ended_at IS NOT NULL
  AND answered_at IS NULL
  AND status = 'ringing';

-- Backfill duration from the timestamps we do have.
UPDATE calls
SET duration_seconds = EXTRACT(EPOCH FROM (ended_at - answered_at))::int
WHERE ended_at IS NOT NULL
  AND answered_at IS NOT NULL
  AND status = 'answered'
  AND duration_seconds IS NULL;
