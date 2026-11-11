const db = require("../../core/config/db.config");
const { withTransaction } = require("../../utils/withTransaction");

class GroupsRepository {
  // Create the group conversation, its member rows (creator seeded as
  // admin) and its name in a single transaction.
  async createGroup({ creatorId, name, memberIds }, client = null) {
    const run = async (tx) => {
      const conversationResult = await tx.query(
        `
        INSERT INTO conversations (id, chat_type, name, created_by, created_at)
        VALUES (gen_random_uuid(), 'group', $1, $2, NOW())
        RETURNING
          id,
          chat_type AS "chatType",
          name,
          created_by AS "createdBy",
          created_at AS "createdAt";
        `,
        [name, creatorId],
      );
      const conversation = conversationResult.rows[0];

      const insertQuery = `
        INSERT INTO conversation_participants
          (conversation_id, user_id, role, joined_at)
        SELECT $1, uid, CASE WHEN uid = $2 THEN 'admin' ELSE 'member' END, NOW()
        FROM unnest($3::uuid[]) AS uid;
      `;
      const allIds = [creatorId, ...memberIds];
      await tx.query(insertQuery, [conversation.id, creatorId, allIds]);

      return conversation;
    };

    return client ? run(client) : withTransaction(run);
  }

  async getGroup(conversationId) {
    const query = `
      SELECT
        id,
        chat_type AS "chatType",
        name,
        avatar_media_id AS "avatarMediaId",
        created_by AS "createdBy",
        created_at AS "createdAt"
      FROM conversations
      WHERE id = $1 AND chat_type = 'group';
    `;
    const result = await db.query(query, [conversationId]);
    return result.rows[0] || null;
  }

  // Full roster, oldest member first (creator joins first).
  async getMembers(conversationId) {
    const query = `
      SELECT
        cp.user_id AS "userId",
        cp.role,
        cp.joined_at AS "joinedAt",
        u.display_name AS "displayName",
        u.phone_number AS "phoneNumber",
        m.storage_key AS "avatarKey"
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      LEFT JOIN media m ON m.id = u.avatar_media_id
      WHERE cp.conversation_id = $1
      ORDER BY cp.joined_at;
    `;
    const result = await db.query(query, [conversationId]);
    return result.rows;
  }

  async getMemberRole(conversationId, userId) {
    const query = `
      SELECT role FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2;
    `;
    const result = await db.query(query, [conversationId, userId]);
    return result.rows[0]?.role ?? null;
  }

  // User ids that are already members of the conversation.
  async filterExistingMembers(conversationId, userIds) {
    const query = `
      SELECT user_id FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = ANY($2::uuid[]);
    `;
    const result = await db.query(query, [conversationId, userIds]);
    return result.rows.map((row) => String(row.user_id));
  }

  async addMembers(conversationId, memberIds, client = null) {
    const query = `
      INSERT INTO conversation_participants
        (conversation_id, user_id, role, joined_at)
      SELECT $1, uid, 'member', NOW()
      FROM unnest($2::uuid[]) AS uid;
    `;
    const run = (tx) => tx.query(query, [conversationId, memberIds]);
    return client ? run(client) : db.query(query, [conversationId, memberIds]);
  }

  async removeMember(conversationId, userId, client = null) {
    const query = `
      DELETE FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2;
    `;
    const run = (tx) => tx.query(query, [conversationId, userId]);
    return client ? run(client) : db.query(query, [conversationId, userId]);
  }

  async updateMemberRole(conversationId, userId, role, client = null) {
    const query = `
      UPDATE conversation_participants
      SET role = $3
      WHERE conversation_id = $1 AND user_id = $2;
    `;
    const run = (tx) => tx.query(query, [conversationId, userId, role]);
    return client
      ? run(client)
      : db.query(query, [conversationId, userId, role]);
  }

  async renameGroup(conversationId, name) {
    const query = `
      UPDATE conversations
      SET name = $2
      WHERE id = $1
      RETURNING name;
    `;

    const result = await db.query(query, [conversationId, name]);
    return result.rows[0] || null;
  }

  // Deleting the conversation cascades to members and messages.
  async deleteGroup(conversationId) {
    const query = `DELETE FROM conversations WHERE id = $1;`;
    await db.query(query, [conversationId]);
  }
}

module.exports = GroupsRepository;
