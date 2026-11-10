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
}

module.exports = CallsRepository;
