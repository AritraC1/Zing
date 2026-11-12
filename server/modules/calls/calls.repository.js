const db = require("../../core/config/db.config");

class CallsRepository {
  async createCall({ conversationId, callerId, calleeId, callType }) {
    const query = `
      INSERT INTO calls (conversation_id, caller_id, callee_id, call_type)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        conversation_id,
        caller_id,
        callee_id,
        call_type AS "callType",
        status,
        started_at AS "startedAt";
    `;

    const result = await db.query(query, [
      conversationId,
      callerId,
      calleeId,
      callType,
    ]);
    return result.rows[0];
  }

  async getCallById(callId) {
    const query = `
      SELECT
        id,
        conversation_id,
        caller_id,
        callee_id,
        call_type AS "callType",
        status,
        started_at AS "startedAt",
        answered_at AS "answeredAt",
        ended_at AS "endedAt"
      FROM calls
      WHERE id = $1;
    `;

    const result = await db.query(query, [callId]);
    return result.rows[0];
  }

  // Callee picked up. Returns null when the call was not in the ringing
  // state (lost race — another tab/device already accepted).
  async markCallAnswered(callId) {
    const query = `
      UPDATE calls
      SET status = 'answered',
          answered_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND status = 'ringing'
      RETURNING id, status;
    `;

    const result = await db.query(query, [callId]);
    return result.rows[0] || null;
  }

  // Terminal states: missed (never answered), rejected (callee declined),
  // cancelled (caller hung up while ringing). For calls that were answered
  // passing status = 'answered' stamps ended_at and the duration. The caller
  // reports `durationSeconds` (time from connection to hangup); when absent
  // the server falls back to answered_at -> now.
  //
  // $2 must be cast to the enum in every usage: `SET status = $2` alone makes
  // Postgres deduce $2 as the call_status enum while `$2 = 'answered'`
  // elsewhere deduces text, which fails the whole statement with
  // "inconsistent types deduced for parameter $2".
  async markCallEnded(callId, status = "answered", durationSeconds = null) {
    const query = `
      UPDATE calls
      SET status = $2::call_status,
          answered_at = COALESCE(answered_at, CASE WHEN $2::call_status = 'answered' THEN NOW() ELSE answered_at END),
          ended_at = NOW(),
          duration_seconds = CASE
            WHEN $2::call_status = 'answered' THEN COALESCE(
              $3::int,
              EXTRACT(EPOCH FROM (NOW() - COALESCE(answered_at, NOW())))::int
            )
            ELSE duration_seconds
          END,
          updated_at = NOW()
      WHERE id = $1
      AND ended_at IS NULL
      RETURNING id, status, started_at AS "startedAt", answered_at AS "answeredAt", ended_at AS "endedAt", duration_seconds AS "durationSeconds";
    `;

    const result = await db.query(query, [
      callId,
      status,
      durationSeconds === null || Number.isNaN(durationSeconds)
        ? null
        : Math.max(0, Math.round(durationSeconds)),
    ]);
    return result.rows[0] || null;
  }

  // Sweep calls whose sockets never delivered a clean hangup (server restart
  // mid-call, dropped connections). Protects history from rows that can never
  // report a duration. Calls orphaned within the last 5 minutes are left
  // alone so a quick dev-server restart doesn't stamp a live P2P call.
  async endOrphanedCalls() {
    const query = `
      WITH orphans AS (
        UPDATE calls
        SET ended_at = updated_at,
            duration_seconds = CASE
              WHEN status = 'answered' AND answered_at IS NOT NULL THEN
                GREATEST(0, EXTRACT(EPOCH FROM (updated_at - answered_at))::int)
              ELSE duration_seconds
            END,
            status = CASE WHEN status = 'ringing' THEN 'missed' ELSE status END,
            updated_at = NOW()
        WHERE ended_at IS NULL
          AND updated_at < NOW() - INTERVAL '5 minutes'
        RETURNING 1
      )
      SELECT count(*) AS ended FROM orphans;
    `;

    const result = await db.query(query);
    return result.rows[0]?.ended ?? 0;
  }

  // Mid-call mode switch (audio <-> video): keep history truthful.
  async updateCallType(callId, callType) {
    const query = `
      UPDATE calls
      SET call_type = $2,
          updated_at = NOW()
      WHERE id = $1
      AND ended_at IS NULL;
    `;
    await db.query(query, [callId, callType]);
  }

  async getCallHistory(userId, limit = 100) {
    const query = `
      SELECT
        c.id,
        c.conversation_id,
        c.caller_id,
        c.callee_id,
        c.call_type AS "callType",
        c.status,
        c.started_at AS "startedAt",
        c.answered_at AS "answeredAt",
        c.ended_at AS "endedAt",
        c.duration_seconds AS "durationSeconds",
        u.id AS "peerId",
        u.display_name AS "peerName",
        u.phone_number AS "peerPhone",
        m.storage_key AS "peerAvatarKey"
      FROM calls c
      JOIN users u
        ON u.id = CASE WHEN c.caller_id = $1 THEN c.callee_id ELSE c.caller_id END
      LEFT JOIN media m ON m.id = u.avatar_media_id
      WHERE c.caller_id = $1 OR c.callee_id = $1
      ORDER BY c.started_at DESC
      LIMIT $2;
    `;

    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }

  // ---------------------------------------------------------------
  // Group calls (SFU-backed)
  // ---------------------------------------------------------------

  async createGroupCall({ conversationId, initiatorId, callType }) {
    const query = `
      INSERT INTO group_calls (conversation_id, initiator_id, call_type, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING
        id,
        conversation_id,
        initiator_id,
        call_type AS "callType",
        status,
        started_at AS "startedAt";
    `;

    const result = await db.query(query, [
      conversationId,
      initiatorId,
      callType,
    ]);
    return result.rows[0];
  }

  async getGroupCallById(callId) {
    const query = `
      SELECT
        id,
        conversation_id AS "conversationId",
        initiator_id AS "initiatorId",
        call_type AS "callType",
        status,
        started_at AS "startedAt",
        ended_at AS "endedAt",
        duration_seconds AS "durationSeconds"
      FROM group_calls
      WHERE id = $1;
    `;
    const result = await db.query(query, [callId]);
    return result.rows[0];
  }

  async addGroupCallParticipant(callId, userId) {
    const query = `
      INSERT INTO group_call_participants (call_id, user_id, joined_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;
    await db.query(query, [callId, userId]);
  }

  async markGroupCallParticipantLeft(callId, userId) {
    const query = `
      UPDATE group_call_participants
      SET left_at = NOW()
      WHERE call_id = $1 AND user_id = $2 AND left_at IS NULL;
    `;
    await db.query(query, [callId, userId]);
  }

  async getGroupCallParticipantIds(callId) {
    const query = `
      SELECT DISTINCT user_id FROM group_call_participants WHERE call_id = $1;
    `;
    const result = await db.query(query, [callId]);
    return result.rows.map((row) => String(row.user_id));
  }

  // Close a group call. `status` becomes 'missed' when no one besides
  // the initiator ever joined, 'ended' otherwise.
  async markGroupCallEnded(callId, status, durationSeconds = null) {
    const query = `
      UPDATE group_calls
      SET status = $2,
          ended_at = NOW(),
          duration_seconds = COALESCE(
            $3::int,
            GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::int)
          ),
          updated_at = NOW()
      WHERE id = $1 AND ended_at IS NULL
      RETURNING id, status;
    `;

    const result = await db.query(query, [
      callId,
      status,
      durationSeconds === null || Number.isNaN(durationSeconds)
        ? null
        : Math.max(0, Math.round(durationSeconds)),
    ]);
    return result.rows[0] || null;
  }

  // Sweep group calls whose sockets never delivered a clean hangup
  // (server restart mid-call). Mirrors endOrphanedCalls for 1:1.
  async endOrphanedGroupCalls() {
    const query = `
      WITH orphans AS (
        UPDATE group_calls
        SET status = CASE WHEN status = 'active' THEN 'ended' ELSE status END,
            duration_seconds = COALESCE(
              duration_seconds,
              GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::int)
            ),
            ended_at = NOW(),
            updated_at = NOW()
        WHERE ended_at IS NULL
          AND updated_at < NOW() - INTERVAL '5 minutes'
        RETURNING id
      )
      UPDATE group_call_participants p
      SET left_at = NOW()
      FROM orphans o
      WHERE p.call_id = o.id AND p.left_at IS NULL;
    `;
    await db.query(query);
  }

  // Call history for the current user across all their groups: every
  // call row for a conversation they are a member of, joined with the
  // group name + member count for display.
  async getGroupCallHistory(userId, limit = 100) {
    const query = `
      SELECT
        gc.id,
        gc.conversation_id,
        gc.initiator_id,
        gc.call_type AS "callType",
        gc.status,
        gc.started_at AS "startedAt",
        gc.ended_at AS "endedAt",
        gc.duration_seconds AS "durationSeconds",
        c.name AS "groupName",
        (
          SELECT COUNT(*)::int FROM conversation_participants cp
          WHERE cp.conversation_id = gc.conversation_id
        ) AS "memberCount",
        (
          SELECT COUNT(DISTINCT pcp.user_id)::int
          FROM group_call_participants pcp
          WHERE pcp.call_id = gc.id
        ) AS "participantCount",
        iu.display_name AS "initiatorName",
        (
          SELECT m.storage_key FROM media m
          WHERE m.id = c.avatar_media_id
        ) AS "groupAvatarKey",
        gc.initiator_id = $1 AS "isInitiator"
      FROM group_calls gc
      JOIN conversations c ON c.id = gc.conversation_id
      JOIN users iu ON iu.id = gc.initiator_id
      WHERE gc.conversation_id IN (
        SELECT conversation_id FROM conversation_participants WHERE user_id = $1
      )
      ORDER BY gc.started_at DESC
      LIMIT $2;
    `;
    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }
}

module.exports = CallsRepository;