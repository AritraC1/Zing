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
  // passing status = 'answered' just stamps ended_at.
  async markCallEnded(callId, status = "answered") {
    const query = `
      UPDATE calls
      SET status = $2,
          answered_at = COALESCE(answered_at, CASE WHEN $2 = 'answered' THEN NOW() ELSE answered_at END),
          ended_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      AND ended_at IS NULL
      RETURNING id, status, started_at AS "startedAt", answered_at AS "answeredAt", ended_at AS "endedAt";
    `;

    const result = await db.query(query, [callId, status]);
    return result.rows[0] || null;
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
