const db = require("../../core/config/db.config");
const ENV = require("../../core/config/env");
const { v4: uuidv4 } = require("uuid");

const getResourceType = (mimeType) => {
  if (!mimeType) return "raw";

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";

  return "raw";
};

const enrichMediaMessage = (row) => {
  if (!row) return row;

  const secureUrl =
    row.secure_url ||
    (row.storage_key && ENV.CLOUDINARY_CLOUD_NAME
      ? `https://res.cloudinary.com/${ENV.CLOUDINARY_CLOUD_NAME}/${getResourceType(
          row.mime_type,
        )}/upload/${row.storage_key}`
      : null);

  return {
    ...row,
    secure_url: secureUrl,
  };
};

// Extra selects shared by every message-row query: the quoted message
// preview (for replies) and the aggregated emoji reactions.
const REPLY_REACTION_SELECT = `
    rp.reply_content,
    rp.reply_msg_type,
    rp.reply_is_deleted,
    rp.reply_sender_name,
    COALESCE(rx.reactions, '[]'::json) AS reactions
`;

// LEFT JOINs powering the selects above. `rp` resolves the quoted
// message (content/type/deletion state + sender name) so the client
// can render the reply preview without a second fetch even when the
// quoted message is outside the current page of history.
const REPLY_REACTION_JOINS = `
    LEFT JOIN LATERAL (
      SELECT
        rm.content AS reply_content,
        rm.msg_type AS reply_msg_type,
        rm.is_deleted AS reply_is_deleted,
        ru.display_name AS reply_sender_name
      FROM messages rm
      JOIN users ru ON rm.sender_id = ru.id
      WHERE rm.id = m.reply_to_id
    ) rp ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object('emoji', r.emoji, 'userId', r.user_id)
        ORDER BY r.created_at
      ) AS reactions
      FROM message_reactions r
      WHERE r.message_id = m.id
    ) rx ON true
`;

class MessageRepository {
  async saveMessage({
    conversationId,
    senderId,
    content,
    clientMsgId = uuidv4(),
    msgType = "text",
    mediaId = null,
    forwardedFromId = null,
    replyToId = null,
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
          reply_to_id,
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
          $7,
          $8
        )
        RETURNING *
      )
      SELECT
        inserted.*,
        u.display_name AS sender_name,

        med.storage_key,
        med.mime_type,
        med.size_byte,
        med.checksum_sha256,
        med.duration_ms,
        med.created_at AS media_created_at,

        rp.reply_content,
        rp.reply_msg_type,
        rp.reply_is_deleted,
        rp.reply_sender_name,
        '[]'::json AS reactions

      FROM inserted
      JOIN users u ON inserted.sender_id = u.id
      LEFT JOIN media med ON inserted.media_id = med.id
      LEFT JOIN LATERAL (
        SELECT
          rm.content AS reply_content,
          rm.msg_type AS reply_msg_type,
          rm.is_deleted AS reply_is_deleted,
          ru.display_name AS reply_sender_name
        FROM messages rm
        JOIN users ru ON rm.sender_id = ru.id
        WHERE rm.id = inserted.reply_to_id
      ) rp ON true;
    `;

    const existing = await this.getMessageByClientId(senderId, clientMsgId);
    if (existing) return existing;

    try {
      const result = await db.query(query, [
        conversationId,
        senderId,
        clientMsgId,
        msgType,
        mediaId,
        forwardedFromId,
        replyToId,
        content,
      ]);
      return enrichMediaMessage(result.rows[0]);
    } catch (err) {
      if (err.code === "23505") {
        // Unique constraint race: another request already saved this
        // client_msg_id — return the stored message so it is not lost.
        const existing = await this.getMessageByClientId(senderId, clientMsgId);
        if (existing) return existing;
      }
      if (
        err.code === "23503" &&
        err.constraint === "messages_conversation_id_fkey"
      ) {
        throw new Error("Cannot save message: conversation does not exist");
      }
      throw err;
    }
  }

  // Edit a text message. Only the sender can edit, only before deletion,
  // and only plain-text messages (media bubbles are not editable).
  async editMessage(messageId, senderId, content) {
    const query = `
      UPDATE messages
      SET content = $3, edited_at = NOW()
      WHERE id = $1
        AND sender_id = $2
        AND msg_type = 'text'
        AND is_deleted = FALSE
      RETURNING *;
    `;

    const result = await db.query(query, [messageId, senderId, content]);
    return result.rows[0] || null;
  }

  // Soft-delete a message for everyone in the conversation. The content
  // is cleared so the plaintext never outlives the deletion.
  async deleteMessage(messageId, senderId) {
    const query = `
      UPDATE messages
      SET is_deleted = TRUE,
          deleted_at = NOW(),
          content = NULL
      WHERE id = $1
        AND sender_id = $2
        AND is_deleted = FALSE
      RETURNING *;
    `;

    const result = await db.query(query, [messageId, senderId]);
    return result.rows[0] || null;
  }

  async getMessageByClientId(senderId, clientMsgId, viewerId = null) {
    // The starred flag is viewer-specific; only include it when a
    // viewer is supplied (callers that already know the sender's view).
    const starredSelect = viewerId
      ? `,
        EXISTS (
          SELECT 1 FROM starred_messages sm
          WHERE sm.message_id = m.id AND sm.user_id = $3
        ) AS starred_by_me
      `
      : "";

    const query = `
      SELECT
        m.*,
        u.display_name AS sender_name,

        med.storage_key,
        med.mime_type,
        med.size_byte,
        med.checksum_sha256,
        med.duration_ms,
        med.created_at AS media_created_at,

        ${REPLY_REACTION_SELECT}
        ${starredSelect}

      FROM messages m

      JOIN users u
        ON m.sender_id = u.id

      LEFT JOIN media med
        ON m.media_id = med.id
${REPLY_REACTION_JOINS}
      WHERE m.sender_id = $1
        AND m.client_msg_id = $2

      LIMIT 1;
    `;

    const params = viewerId
      ? [senderId, clientMsgId, viewerId]
      : [senderId, clientMsgId];
    const result = await db.query(query, params);
    return enrichMediaMessage(result.rows[0]);
  }

  async getMessagesByConversation(conversationId, limit = 50, offset = 0, viewerId = null) {
    // starred_by_me lets the client render the star state without a
    // second query; $4 is the viewer when provided.
    const starredSelect = viewerId
      ? `,
        EXISTS (
          SELECT 1 FROM starred_messages sm
          WHERE sm.message_id = m.id AND sm.user_id = $4
        ) AS starred_by_me
      `
      : "";

    const query = `
      SELECT
        m.*,
        u.display_name AS sender_name,

        med.storage_key,
        med.mime_type,
        med.size_byte,
        med.checksum_sha256,
        med.duration_ms,
        med.created_at AS media_created_at,

        ${REPLY_REACTION_SELECT}
        ${starredSelect}

      FROM messages m

      JOIN users u
        ON m.sender_id = u.id

      LEFT JOIN media med
        ON m.media_id = med.id
${REPLY_REACTION_JOINS}
      WHERE m.conversation_id = $1

      ORDER BY m.sequence_no ASC

      LIMIT $2
      OFFSET $3;
    `;

    const params = viewerId
      ? [conversationId, limit, offset, viewerId]
      : [conversationId, limit, offset];
    const result = await db.query(query, params);
    return result.rows.map(enrichMediaMessage);
  }

  // Fetch a single message scoped to a conversation — used to validate
  // reply targets (must quote a message in the same conversation).
  async getMessageInConversation(conversationId, messageId) {
    const query = `
      SELECT id, sender_id, msg_type, is_deleted, content
      FROM messages
      WHERE id = $1
        AND conversation_id = $2
      LIMIT 1;
    `;
    const result = await db.query(query, [messageId, conversationId]);
    return result.rows[0] || null;
  }

  async getMessageStatusesForConversation(conversationId) {    const query = `
      SELECT ms.message_id, ms.user_id, ms.msg_status, ms.delivered_at, ms.seen_at, ms.created_at
      FROM message_status ms
      JOIN messages m ON ms.message_id = m.id
      WHERE m.conversation_id = $1;
    `;
    const result = await db.query(query, [conversationId]);
    return result.rows;
  }

  // -------------------------------------------------------------
  // Reactions
  // -------------------------------------------------------------

  // Adds a reaction (idempotent) and returns the message's full
  // reaction list so callers can broadcast the new state.
  async addReaction(messageId, userId, emoji) {
    const query = `
      INSERT INTO message_reactions (message_id, user_id, emoji)
      VALUES ($1, $2, $3)
      ON CONFLICT (message_id, user_id, emoji) DO NOTHING;
    `;
    await db.query(query, [messageId, userId, emoji]);
    return this.getReactionsForMessage(messageId);
  }

  // Removes one reaction of this user (the exact emoji row) and
  // returns the message's full reaction list.
  async removeReaction(messageId, userId, emoji) {
    const query = `
      DELETE FROM message_reactions
      WHERE message_id = $1
        AND user_id = $2
        AND emoji = $3;
    `;
    await db.query(query, [messageId, userId, emoji]);
    return this.getReactionsForMessage(messageId);
  }

  async getReactionsForMessage(messageId) {
    const query = `
      SELECT user_id, emoji, created_at
      FROM message_reactions
      WHERE message_id = $1
      ORDER BY created_at;
    `;
    const result = await db.query(query, [messageId]);
    return result.rows.map(({ user_id, emoji, created_at }) => ({
      userId: user_id,
      emoji,
      createdAt: created_at,
    }));
  }

  async getReactionsForConversation(conversationId) {
    const query = `
      SELECT r.message_id, r.user_id, r.emoji, r.created_at
      FROM message_reactions r
      JOIN messages m ON r.message_id = m.id
      WHERE m.conversation_id = $1
      ORDER BY r.created_at;
    `;
    const result = await db.query(query, [conversationId]);
    return result.rows.map((row) => ({
      messageId: row.message_id,
      userId: row.user_id,
      emoji: row.emoji,
      createdAt: row.created_at,
    }));
  }

  // -------------------------------------------------------------
  // Starred messages
  // -------------------------------------------------------------

  // Star is a per-user bookmark: idempotent, and re-starring is a no-op.
  async starMessage(userId, messageId) {
    const query = `
      INSERT INTO starred_messages (user_id, message_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, message_id) DO NOTHING;
    `;
    await db.query(query, [userId, messageId]);
    return true;
  }

  async unstarMessage(userId, messageId) {
    const query = `
      DELETE FROM starred_messages
      WHERE user_id = $1 AND message_id = $2;
    `;
    const result = await db.query(query, [userId, messageId]);
    return result.rowCount > 0;
  }

  // The user's starred list across all conversations, newest first.
  // Includes conversation + peer context so the client can render
  // "who said it / in which chat" rows and jump into the conversation.
  async getStarredMessages(userId) {
    const query = `
      SELECT
        m.*,
        u.display_name AS sender_name,
        sm.created_at AS starred_at,

        med.storage_key,
        med.mime_type,
        med.size_byte,
        med.checksum_sha256,
        med.duration_ms,
        med.created_at AS media_created_at,

        rp.reply_content,
        rp.reply_msg_type,
        rp.reply_is_deleted,
        rp.reply_sender_name,
        COALESCE(rx.reactions, '[]'::json) AS reactions,

        c.id AS conversation_id,
        c.chat_type AS conversation_chat_type,
        peer.id AS peer_id,
        peer.display_name AS peer_name,
        peer_phone.phone_number AS peer_phone

      FROM starred_messages sm
      JOIN messages m ON sm.message_id = m.id
      JOIN users u ON m.sender_id = u.id
      JOIN conversations c ON m.conversation_id = c.id
      LEFT JOIN media med ON m.media_id = med.id
      LEFT JOIN LATERAL (
        SELECT
          rm.content AS reply_content,
          rm.msg_type AS reply_msg_type,
          rm.is_deleted AS reply_is_deleted,
          ru.display_name AS reply_sender_name
        FROM messages rm
        JOIN users ru ON rm.sender_id = ru.id
        WHERE rm.id = m.reply_to_id
      ) rp ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object('emoji', r.emoji, 'userId', r.user_id)
          ORDER BY r.created_at
        ) AS reactions
        FROM message_reactions r
        WHERE r.message_id = m.id
      ) rx ON true
      LEFT JOIN LATERAL (
        SELECT cp.user_id
        FROM conversation_participants cp
        WHERE cp.conversation_id = c.id AND cp.user_id != $1
        LIMIT 1
      ) other_participant ON true
      LEFT JOIN users peer ON peer.id = other_participant.user_id
      LEFT JOIN LATERAL (
        SELECT up.phone_number
        FROM users up
        WHERE up.id = other_participant.user_id
      ) peer_phone ON true

      WHERE sm.user_id = $1
        AND m.is_deleted = FALSE

      ORDER BY sm.created_at DESC;
    `;

    const result = await db.query(query, [userId]);
    return result.rows.map(enrichMediaMessage);
  }

  async initializeMessageStatuses(messageId, recipientIds) {
    if (!recipientIds?.length) return;

    const values = recipientIds
      .map((_, index) => `($1, $${index + 2}, 'sent')`)
      .join(", ");

    const query = `
      INSERT INTO message_status (message_id, user_id, msg_status)
      VALUES ${values};
    `;

    await db.query(query, [messageId, ...recipientIds]);
  }

  async updateMessageStatus(messageId, userId, msgStatus) {
    const query = `
      UPDATE message_status
      SET msg_status = $3::message_delivery_status,
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

  async markConversationAsSeen(conversationId, userId) {
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

  async markAllPendingAsDelivered(userId) {
    const query = `
      UPDATE message_status ms
      SET msg_status = 'delivered',
          delivered_at = NOW()
      FROM messages m
      WHERE ms.message_id = m.id
        AND ms.user_id = $1
        AND ms.msg_status = 'sent'
      RETURNING ms.message_id, m.sender_id, m.conversation_id;
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }
}

module.exports = MessageRepository;
