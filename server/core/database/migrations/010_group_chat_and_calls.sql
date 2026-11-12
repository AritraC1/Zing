-- 010: Group chat + SFU-backed group calls.
--
-- Conversations of type 'group' carry their metadata (name, avatar,
-- creator) on the conversations row itself; members live in
-- conversation_participants as before, with an added role column
-- ('admin' | 'member'). Group call history is tracked in
-- group_calls / group_call_participants; the SFU itself is stateless
-- (rooms live in the mediasoup worker, not the DB).
--
-- Every statement is idempotent so this migration can run on both
-- existing databases and fresh installs where the bootstrap schemas
-- already contain the final shape.

-- ---------------------------------------------------------------
-- Group metadata on conversations
-- ---------------------------------------------------------------
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_media_id UUID REFERENCES media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------
-- Member roles (creator is seeded as 'admin')
-- ---------------------------------------------------------------
ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

-- ---------------------------------------------------------------
-- Group call history (SFU calls, up to 5 participants)
-- ---------------------------------------------------------------
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
