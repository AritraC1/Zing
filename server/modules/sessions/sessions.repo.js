const db = require("../../config/db");

class SessionRepo {
  // create a session
  static async createSession({ id, deviceId, refreshTokenHash, expiresAt }, client = db) {
    const query = `
      INSERT INTO sessions (
        id,
        device_id,
        refresh_token_hash,
        expires_at
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const values = [id, deviceId, refreshTokenHash, expiresAt];
    const result = await client.query(query, values);

    return result.rows[0];
  }

  // Find
  static async findByRefreshTokenHash(hash) {
    const query = `
      SELECT *
      FROM sessions
      WHERE refresh_token_hash = $1
      AND revoked = FALSE
    `;

    const result = await db.query(query, [hash]);
    return result.rows[0];
  }

  // revoke a session
  static async revokeSession(sessionId) {
    const query = `
      UPDATE sessions
      SET revoked = TRUE
      WHERE id = $1
    `;

    await db.query(query, [sessionId]);
  }

  // revoke device session
  static async revokeDeviceSessions(deviceId, client = db) {
    const query = `
      UPDATE sessions
      SET revoked = TRUE
      WHERE device_id = $1
    `;

    await client.query(query, [deviceId]);
  }

  // revoke all sessions for a user
  static async revokeAllUserSessions(userId) {
    const query = `
      UPDATE sessions
      SET revoked = TRUE
      WHERE device_id IN (
        SELECT id FROM devices WHERE user_id = $1
      )
    `;

    await db.query(query, [userId]);
  }

  // Update last used
  static async updateLastUsed(sessionId) {
    const query = `
      UPDATE sessions
      SET last_used_at = NOW()
      WHERE id = $1
    `;

    await db.query(query, [sessionId]);
  }
}

module.exports = SessionRepo;
