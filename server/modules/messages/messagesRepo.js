// message.repo.js
const db = require("../../config/db");

class MessageRepo {
  static async saveMessage(conversationId, senderId, content) {
    const query = `
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    try {
      const result = await db.query(query, [conversationId, senderId, content]);
      return result.rows[0];
    } catch (err) {
      if (err.code === "23503" && err.constraint === "messages_conversation_id_fkey") {
        throw new Error("Cannot save message: conversation does not exist");
      }
      throw err;
    }
  }

  static async getMessagesByConversation(
    conversationId,
    limit = 50,
    offset = 0,
  ) {
    const query = `
      SELECT m.*, u.username AS sender_username
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3;
    `;
    const result = await db.query(query, [conversationId, limit, offset]);
    return result.rows;
  }

  static async markAsRead(conversationId, userId) {
    const query = `
      UPDATE messages
      SET is_read = TRUE
      WHERE conversation_id = $1
        AND sender_id != $2
        AND is_read = FALSE;
    `;
    await db.query(query, [conversationId, userId]);
  }
}

module.exports = MessageRepo;
