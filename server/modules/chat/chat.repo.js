const db = require("../../config/db");

class ChatRepo {
  // Create a conversation
  static async createConversation(chatType) {
    const query = `
            INSERT INTO conversations (id, chat_type, created_at)
            VALUES (gen_random_uuid(), $1, NOW())
            RETURNING id;
        `;

    const result = await db.query(query, [chatType]);
    return result.rows[0];
  }

  // Find existing direct conversation between 2 users
  static async findDirectConversation(user1, user2) {
    const query = `
        SELECT cp1.conversation_id
        FROM conversation_participants cp1
        JOIN conversation_participants cp2
          ON cp1.conversation_id = cp2.conversation_id
        JOIN conversations c
          ON c.id = cp1.conversation_id
        WHERE cp1.user_id = $1
          AND cp2.user_id = $2
          AND c.chat_type = 'direct'
        LIMIT 1;
    `;

    const result = await db.query(query, [user1, user2]);
    return result.rows[0];
  }

  // Get all conversations for a user
  static async getUserConversations(userId) {
    const query = `
    SELECT
      c.id,
      c.chat_type AS "chatType",
      c.created_at AS "createdAt",
      c.last_message_at AS "lastMessageAt",
      u.id AS "otherUserId",
      u.display_name AS "otherUserName",
      u.phone_number AS "otherUserPhone",
      om.storage_key AS "otherUserAvatarKey",
      lm.content AS "lastMessageContent",
      lm.created_at AS "lastMessageCreatedAt"
    FROM conversations c
    JOIN conversation_participants cp
      ON c.id = cp.conversation_id
    JOIN conversation_participants cp_other
      ON c.id = cp_other.conversation_id
      AND cp_other.user_id != cp.user_id
    JOIN users u
      ON cp_other.user_id = u.id
    LEFT JOIN media om
      ON u.avatar_media_id = om.id
    LEFT JOIN LATERAL (
      SELECT m.content, m.created_at
      FROM messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.sequence_no DESC
      LIMIT 1
    ) lm ON true
    WHERE cp.user_id = $1
    ORDER BY COALESCE(lm.created_at, c.last_message_at, c.created_at) DESC;
  `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }

  // Update last mesage time stamp
  static async updateLastMessage(conversationId) {
    const query = `
    UPDATE conversations
    SET last_message_at = NOW()
    WHERE id = $1;
  `;
    await db.query(query, [conversationId]);
  }

  // Get all participants in a conversation
  static async getParticipants(conversationId) {
    const query = `
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = $1;
  `;
    const result = await db.query(query, [conversationId]);
    return result.rows;
  }
}

module.exports = ChatRepo;
