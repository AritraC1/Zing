-- 004: Calls (1:1 audio/video call history)

CREATE TYPE call_type AS ENUM ('audio', 'video');

CREATE TYPE call_status AS ENUM ('ringing', 'answered', 'missed', 'rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_type call_type NOT NULL,
    status call_status NOT NULL DEFAULT 'ringing',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls (caller_id);

CREATE INDEX IF NOT EXISTS idx_calls_callee ON calls (callee_id);

CREATE INDEX IF NOT EXISTS idx_calls_conversation
  ON calls (conversation_id, started_at DESC);
