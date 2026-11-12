const db = require("../../core/config/db.config");

class ChatRepository {
  async createConversation(chatType) {
    const query = `
            INSERT INTO conversations (id, chat_type, created_at)
            VALUES (gen_random_uuid(), $1, NOW())
            RETURNING id;
        `;

    const result = await db.query(query, [chatType]);
    return result.rows[0];
  }

  async findDirectConversation(user1, user2) {
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

  async getUserConversations(userId) {
    const query = `
    SELECT
      c.id,
      c.chat_type AS "chatType",
      c.created_at AS "createdAt",
      c.last_message_at AS "lastMessageAt",
      -- Group chats carry their own metadata...
      c.name AS "groupName",
      c.created_by AS "createdBy",
      gav.storage_key AS "groupAvatarKey",
      cp.role AS "myRole",
      -- ...and NULL member columns (the lateral join below only
      -- matches direct chats, so group rows stay single-valued).
      u.id AS "otherUserId",
      u.display_name AS "otherUserName",
      u.phone_number AS "otherUserPhone",
      u.last_seen_at AS "otherUserLastSeenAt",
      om.storage_key AS "otherUserAvatarKey",
      lm.content AS "lastMessageContent",
      lm.created_at AS "lastMessageCreatedAt",
      cp.is_archived AS "isArchived",
      cp.is_muted AS "isMuted",
      (
        SELECT COUNT(*)::int
        FROM message_status ms
        JOIN messages m ON ms.message_id = m.id
        WHERE m.conversation_id = c.id
          AND ms.user_id = $1
          AND ms.msg_status != 'seen'
          AND m.sender_id != $1
      ) AS "unreadCount"
    FROM conversations c
    JOIN conversation_participants cp
      ON c.id = cp.conversation_id
      AND cp.user_id = $1
    -- Direct chats resolve their one "other user"; group chats skip
    -- this join entirely (their members are fetched in bulk separately).
    LEFT JOIN conversation_participants cp_other
      ON c.id = cp_other.conversation_id
      AND c.chat_type = 'direct'
      AND cp_other.user_id != cp.user_id
    LEFT JOIN users u
      ON cp_other.user_id = u.id
    LEFT JOIN media om
      ON u.avatar_media_id = om.id
    LEFT JOIN media gav
      ON c.avatar_media_id = gav.id
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

  // Bulk-fetch the members of many group conversations at once. Used by
  // getMyConversations to attach a members array to every group row.
  async getGroupMembersForConversations(conversationIds) {
    if (!conversationIds.length) return [];

    const query = `
      SELECT
        cp.conversation_id AS "conversationId",
        cp.user_id AS "userId",
        cp.role,
        cp.joined_at AS "joinedAt",
        u.display_name AS "displayName",
        u.phone_number AS "phoneNumber",
        m.storage_key AS "avatarKey"
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      LEFT JOIN media m ON m.id = u.avatar_media_id
      WHERE cp.conversation_id = ANY($1::uuid[])
      ORDER BY cp.joined_at;
    `;

    const result = await db.query(query, [conversationIds]);
    return result.rows;
  }

  // Full member roster of one group conversation (group info pane).
  async getGroupMembers(conversationId) {
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

  async getConversationType(conversationId) {
    const query = `
      SELECT chat_type AS "chatType" FROM conversations WHERE id = $1;
    `;
    const result = await db.query(query, [conversationId]);
    return result.rows[0]?.chatType ?? null;
  }

  // Update last mesage time stamp
  async updateLastMessage(conversationId) {
    const query = `
    UPDATE conversations
    SET last_message_at = NOW()
    WHERE id = $1;
  `;
    await db.query(query, [conversationId]);
  }

  // Set the per-user archive flag on a conversation participant row.
  async setParticipantArchived(conversationId, userId, archived) {
    const query = `
    UPDATE conversation_participants
    SET is_archived = $3
    WHERE conversation_id = $1
      AND user_id = $2
    RETURNING is_archived;
  `;

    const result = await db.query(query, [
      conversationId,
      userId,
      Boolean(archived),
    ]);
    return result.rows[0] || null;
  }

  // Get all participants in a conversation
  async getParticipants(conversationId) {
    const query = `
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = $1;
  `;
    const result = await db.query(query, [conversationId]);
    return result.rows;
  }

  // Set the per-user mute flag on a conversation participant row.
  async setParticipantMuted(conversationId, userId, muted) {
    const query = `
    UPDATE conversation_participants
    SET is_muted = $3
    WHERE conversation_id = $1
      AND user_id = $2
    RETURNING is_muted;
  `;

    const result = await db.query(query, [
      conversationId,
      userId,
      Boolean(muted),
    ]);
    return result.rows[0] || null;
  }

  // Mute check for the push pipeline: should this user be woken up for
  // activity in this conversation?
  async isParticipantMuted(conversationId, userId) {
    const query = `
    SELECT is_muted FROM conversation_participants
    WHERE conversation_id = $1
      AND user_id = $2;
  `;

    const result = await db.query(query, [conversationId, userId]);
    return Boolean(result.rows[0]?.is_muted);
  }
}

module.exports = ChatRepository;
