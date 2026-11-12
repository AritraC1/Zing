-- Group calls: SFU-backed group audio/video call history.
-- Media itself never touches the DB — these rows only record
-- lifecycle (who joined, when the room opened/closed, duration).

CREATE TABLE IF NOT EXISTS group_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_type call_type NOT NULL DEFAULT 'video',
    status TEXT NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_calls_conversation
  ON group_calls (conversation_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_calls_initiator
  ON group_calls (initiator_id);

CREATE TABLE IF NOT EXISTS group_call_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES group_calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_group_call_participants_call
  ON group_call_participants (call_id);

CREATE INDEX IF NOT EXISTS idx_group_call_participants_user
  ON group_call_participants (user_id);
