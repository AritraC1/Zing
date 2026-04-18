// message.repo.js
const db = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

class MessageRepo {
  static async saveMessage({
    conversationId,
    senderId,
    content,
    clientMsgId = uuidv4(),
    msgType = "text",
    mediaId = null,
    forwardedFromId = null,
  }) {
    const query = `
      WITH inserted AS (
        INSERT INTO messages (
          conversation_id,
          sender_id,
          client_msg_id,
          sequence_no,
          msg_type,
          media_id,
          forwarded_from_id,
          content
        )
        VALUES (
          $1,
          $2,
          $3,
          COALESCE((SELECT MAX(sequence_no) FROM messages WHERE conversation_id = $1), 0) + 1,
          $4,
          $5,
          $6,
          $7
        )
        RETURNING *
      )
      SELECT inserted.*, u.display_name AS sender_name
      FROM inserted
      JOIN users u ON inserted.sender_id = u.id;
    `;

    try {
      const result = await db.query(query, [
        conversationId,
        senderId,
        clientMsgId,
        msgType,
        mediaId,
        forwardedFromId,
        content,
      ]);
      return result.rows[0];
    } catch (err) {
      if (err.code === "23503" && err.constraint === "messages_conversation_id_fkey") {
        throw new Error("Cannot save message: conversation does not exist");
      }
      throw err;
    }
  }

  static async getMessageByClientId(senderId, clientMsgId) {
    const query = `
      SELECT m.*, u.display_name AS sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.sender_id = $1
        AND m.client_msg_id = $2
      LIMIT 1;
    `;
    const result = await db.query(query, [senderId, clientMsgId]);
    return result.rows[0];
  }

  static async getMessagesByConversation(
    conversationId,
    limit = 50,
    offset = 0,
  ) {
    const query = `
      SELECT m.*, u.display_name AS sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.sequence_no ASC
      LIMIT $2
      OFFSET $3;
    `;
    const result = await db.query(query, [conversationId, limit, offset]);
    return result.rows;
  }

  static async getMessageStatusesForConversation(conversationId) {
    const query = `
      SELECT ms.message_id, ms.user_id, ms.msg_status, ms.delivered_at, ms.seen_at, ms.created_at
      FROM message_status ms
      JOIN messages m ON ms.message_id = m.id
      WHERE m.conversation_id = $1;
    `;
    const result = await db.query(query, [conversationId]);
    return result.rows;
  }

  static async initializeMessageStatuses(messageId, recipientIds) {
    if (!recipientIds?.length) {
      return;
    }

    const values = recipientIds
      .map((_, index) => `($1, $${index + 2}, 'sent')`)
      .join(", ");

    const query = `
      INSERT INTO message_status (message_id, user_id, msg_status)
      VALUES ${values};
    `;

    await db.query(query, [messageId, ...recipientIds]);
  }

  static async updateMessageStatus(messageId, userId, msgStatus) {
    const query = `
      UPDATE message_status
      SET msg_status = $3,
          delivered_at = CASE
            WHEN $3 = 'delivered' AND delivered_at IS NULL THEN NOW()
            ELSE delivered_at
          END,
          seen_at = CASE
            WHEN $3 = 'seen' AND seen_at IS NULL THEN NOW()
            ELSE seen_at
          END
      WHERE message_id = $1
        AND user_id = $2
        AND (
          ($3 = 'delivered' AND msg_status = 'sent') OR
          ($3 = 'seen' AND msg_status IN ('sent', 'delivered'))
        )
      RETURNING *;
    `;

    const result = await db.query(query, [messageId, userId, msgStatus]);
    return result.rows;
  }

  static async markConversationAsSeen(conversationId, userId) {
    const query = `
      UPDATE message_status ms
      SET msg_status = 'seen',
          seen_at = NOW()
      FROM messages m
      WHERE ms.message_id = m.id
        AND m.conversation_id = $1
        AND ms.user_id = $2
        AND ms.msg_status != 'seen'
      RETURNING ms.message_id;
    `;

    const result = await db.query(query, [conversationId, userId]);
    return result.rows;
  }

  static async markAllPendingAsDelivered(userId) {
    const query = `
      UPDATE message_status ms
      SET msg_status = 'delivered',
          delivered_at = NOW()
      FROM messages m
      WHERE ms.message_id = m.id
        AND ms.user_id = $1
        AND ms.msg_status = 'sent'
      RETURNING ms.message_id, m.sender_id;
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }
}

module.exports = MessageRepo;
