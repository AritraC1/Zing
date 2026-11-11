const db = require("../../core/config/db.config");

class BlocksRepository {
  // Block a user. Idempotent: blocking twice keeps a single row.
  async blockUser(blockerId, blockedId) {
    const query = `
      INSERT INTO blocked_users (blocker_id, blocked_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
      RETURNING *;
    `;

    const result = await db.query(query, [blockerId, blockedId]);
    return result.rows[0] || null;
  }

  async unblockUser(blockerId, blockedId) {
    const query = `
      DELETE FROM blocked_users
      WHERE blocker_id = $1 AND blocked_id = $2;
    `;

    const result = await db.query(query, [blockerId, blockedId]);
    return result.rowCount > 0;
  }

  async getBlockedUserIds(userId) {
    const query = `
      SELECT blocked_id
      FROM blocked_users
      WHERE blocker_id = $1;
    `;

    const result = await db.query(query, [userId]);
    return result.rows.map((row) => row.blocked_id);
  }

  // A block in either direction stops messaging between the pair.
  // Returns the first matching row (null when nothing is blocked).
  async findBlockedBetween(userId, otherUserIds) {
    if (!otherUserIds?.length) return null;

    const query = `
      SELECT blocker_id, blocked_id
      FROM blocked_users
      WHERE (blocker_id = $1 AND blocked_id = ANY($2::uuid[]))
         OR (blocked_id = $1 AND blocker_id = ANY($2::uuid[]))
      LIMIT 1;
    `;

    const result = await db.query(query, [userId, otherUserIds]);
    return result.rows[0] || null;
  }
}

module.exports = BlocksRepository;
