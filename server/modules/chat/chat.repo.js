const db = require("../../config/db");

class ChatRepo {
  static async createConversation(chatType) {
    const query = `
            INSERT INTO conversations (id, chat_type, created_at)
            VALUES (gen_random_uuid(), $1, NOW())
            RETURNING id;
        `;

    const result = await db.query(query, [chatType]);
    return result.rows[0];
  }

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

  static async getUserConversations(userId) {
    const query = `
    SELECT c.id, c.chat_type, c.created_at, c.last_message_at
    FROM conversations c
    JOIN conversation_participants cp
      ON c.id = cp.conversation_id
    WHERE cp.user_id = $1
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC;
  `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async updateLastMessage(conversationId) {
    const query = `
    UPDATE conversations
    SET last_message_at = NOW()
    WHERE id = $1;
  `;
    await db.query(query, [conversationId]);
  }

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
