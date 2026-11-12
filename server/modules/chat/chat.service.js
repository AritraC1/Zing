const ChatRepository = require("./chat.repository");
const ParticipantsRepository = require("./participants.repository");
const MessageRepository = require("../messages/messages.repository");
const BlocksRepository = require("../blocks/blocks.repository");
const { assertConversationParticipant } = require("./chat.access");
const { buildMediaUrl } = require("../../utils/mediaUrl");
const { withTransaction } = require("../../utils/withTransaction");
const AppError = require("../../core/errors/AppError");

const PAGE_SIZE = 50;

// Reactions accepted on messages. Kept server-side so clients can't
// submit arbitrary strings; each is a single grapheme-ish token.
const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  // Shape a member row from the bulk roster query.
  const shapeGroupMember = (row) => ({
    userId: row.userId,
    displayName: row.displayName || row.phoneNumber || "Member",
    phoneNumber: row.phoneNumber,
    role: row.role,
    avatarUrl: row.avatarKey ? buildMediaUrl(row.avatarKey) : null,
    joinedAt: row.joinedAt,
  });

class ChatService {
  constructor() {
    this.chatRepo = new ChatRepository();
    this.participantsRepository = new ParticipantsRepository();
    this.messageRepo = new MessageRepository();
    this.blocksRepo = new BlocksRepository();
  }

  // Get all conversations for the current user with the other participant's details
  async getMyConversations(userId) {
    const rows = await this.chatRepo.getUserConversations(userId);

    // Group conversations: attach the full member roster in one extra
    // bulk query instead of a lateral join per row.
    const groupIds = rows
      .filter((row) => row.chatType === "group")
      .map((row) => row.id);

    const memberRows = await this.chatRepo.getGroupMembersForConversations(
      groupIds,
    );

    const membersByConversation = new Map();
    memberRows.forEach((row) => {
      if (!membersByConversation.has(row.conversationId)) {
        membersByConversation.set(row.conversationId, []);
      }
      membersByConversation
        .get(row.conversationId)
        .push(shapeGroupMember(row));
    });

    return rows.map((row) => {
      if (row.chatType === "group") {
        return {
          ...row,
          groupName: row.groupName || "Group",
          groupAvatarUrl: row.groupAvatarKey
            ? buildMediaUrl(row.groupAvatarKey)
            : null,
          members: membersByConversation.get(row.id) || [],
          otherUserId: null,
          otherUserName: null,
          otherUserPhone: null,
          otherUserLastSeenAt: null,
          otherUserAvatarUrl: null,
        };
      }

      return {
        ...row,
        otherUserAvatarUrl: row.otherUserAvatarKey
          ? buildMediaUrl(row.otherUserAvatarKey)
          : null,
      };
    });
  }

  // Create a direct 1:1 conversation or return the existing one
  async createDirectConversation(currentUserId, otherUserId) {
    if (String(otherUserId) === String(currentUserId)) {
      throw new AppError("Cannot start a conversation with yourself", 400);
    }

    const existingConversation = await this.chatRepo.findDirectConversation(
      currentUserId,
      otherUserId,
    );

    if (existingConversation) {
      return {
        conversationId: existingConversation.conversation_id,
        created: false,
      };
    }

    const blocked = await this.blocksRepo.findBlockedBetween(currentUserId, [
      otherUserId,
    ]);
    if (blocked) {
      throw new AppError("You can't start a conversation with this contact", 403);
    }

    return withTransaction(async (client) => {
      const raceExisting = await this.chatRepo.findDirectConversation(
        currentUserId,
        otherUserId,
        client,
      );

      if (raceExisting) {
        return {
          conversationId: raceExisting.conversation_id,
          created: false,
        };
      }

      const newConversation = await this.chatRepo.createConversation(
        "direct",
        client,
      );

      await this.participantsRepository.addTwoParticipants(
        newConversation.id,
        currentUserId,
        otherUserId,
        client,
      );

      return {
        conversationId: newConversation.id,
        created: true,
      };
    });
  }

  // Save a message on behalf of a participant. Idempotent on clientMsgId
  // so retries (socket or REST) never create duplicates.
  async sendMessage({
    conversationId,
    userId,
    content,
    clientMsgId,
    msgType = "text",
    mediaId = null,
    forwardedFromId = null,
    replyToId = null,
  }) {
    await assertConversationParticipant(conversationId, userId);

    // A reply must quote a message in the same conversation.
    if (replyToId) {
      const replyTarget = await this.messageRepo.getMessageInConversation(
        conversationId,
        replyToId,
      );
      if (!replyTarget) {
        throw new AppError("Reply target not found in this conversation", 400);
      }
    }

    const existing = await this.messageRepo.getMessageByClientId(
      userId,
      clientMsgId,
    );
    if (existing) {
      return { message: existing, created: false, participants: [] };
    }

    const participants = await this.chatRepo.getParticipants(conversationId);

    // A block in either direction stops message delivery for the pair.
    // In group chats messaging is unaffected by blocks between members.
    const chatType = await this.chatRepo.getConversationType(conversationId);
    if (chatType === "direct") {
      const blocked = await this.blocksRepo.findBlockedBetween(
        userId,
        participants
          .filter(({ user_id }) => String(user_id) !== String(userId))
          .map(({ user_id }) => user_id),
      );
      if (blocked) {
        const youBlocked = String(blocked.blocker_id) === String(userId);
        throw new AppError(
          youBlocked
            ? "You blocked this contact. Unblock them to send messages."
            : "You can't send messages to this contact.",
          403,
        );
      }
    }

    const message = await this.messageRepo.saveMessage({
      conversationId,
      senderId: userId,
      content,
      clientMsgId,
      msgType,
      mediaId,
      forwardedFromId,
      replyToId,
    });

    const recipientIds = participants
      .filter(({ user_id }) => String(user_id) !== String(userId))
      .map(({ user_id }) => user_id);

    await this.messageRepo.initializeMessageStatuses(message.id, recipientIds);
    await this.chatRepo.updateLastMessage(conversationId);

    return { message, created: true, participants };
  }

  // Fetch messages for a conversation after verifying the user is a participant
  async getMessages(conversationId, userId, offset = 0) {
    await assertConversationParticipant(conversationId, userId);

    const [messages, statuses] = await Promise.all([
      this.messageRepo.getMessagesByConversation(
        conversationId,
        PAGE_SIZE,
        offset,
        userId, // viewer — populates starred_by_me on each row
      ),
      this.messageRepo.getMessageStatusesForConversation(conversationId),
    ]);

    return {
      messages,
      statuses,
      offset,
      hasMore: messages.length === PAGE_SIZE,
    };
  }

  // Edit a message. Only the sender may edit, only text messages.
  async editMessage({ conversationId, messageId, userId, content }) {
    await assertConversationParticipant(conversationId, userId);

    const updated = await this.messageRepo.editMessage(
      messageId,
      userId,
      content,
    );

    if (!updated) {
      throw new AppError("Message not found or cannot be edited", 404);
    }

    const participants = await this.chatRepo.getParticipants(conversationId);

    return { message: updated, participants };
  }

  // Soft-delete a message. Only the sender may delete.
  async deleteMessage({ conversationId, messageId, userId }) {
    await assertConversationParticipant(conversationId, userId);

    const deleted = await this.messageRepo.deleteMessage(messageId, userId);

    if (!deleted) {
      throw new AppError("Message not found or already deleted", 404);
    }

    const participants = await this.chatRepo.getParticipants(conversationId);

    return { message: deleted, participants };
  }

  // Toggle this user's personal archive flag for a conversation.
  async setArchived(conversationId, userId, archived) {
    await assertConversationParticipant(conversationId, userId);

    const updated = await this.chatRepo.setParticipantArchived(
      conversationId,
      userId,
      archived,
    );

    if (!updated) {
      throw new AppError("Conversation not found", 404);
    }

    return { conversationId, archived: updated.is_archived };
  }

  // Toggle this user's personal mute flag for a conversation. Muted
  // conversations no longer wake the user via push (Part of the
  // notifications pipeline).
  async setMuted(conversationId, userId, muted) {
    await assertConversationParticipant(conversationId, userId);

    const updated = await this.chatRepo.setParticipantMuted(
      conversationId,
      userId,
      muted,
    );

    if (!updated) {
      throw new AppError("Conversation not found", 404);
    }

    return { conversationId, muted: updated.is_muted };
  }

  // -------------------------------------------------------------
  // Reactions
  // -------------------------------------------------------------

  // Add or remove the current user's emoji on a message. Both
  // directions of a block also stop reactions, mirroring messaging.
  // Returns the message's full reaction list so callers can broadcast
  // the new state to every participant device.
  async setReaction({ conversationId, messageId, userId, emoji, action }) {
    await assertConversationParticipant(conversationId, userId);

    if (!ALLOWED_REACTIONS.includes(emoji)) {
      throw new AppError("Unsupported reaction", 400);
    }
    if (action !== "add" && action !== "remove") {
      throw new AppError("action must be 'add' or 'remove'", 400);
    }

    const message = await this.messageRepo.getMessageInConversation(
      conversationId,
      messageId,
    );
    if (!message) {
      throw new AppError("Message not found in this conversation", 404);
    }
    if (message.is_deleted) {
      throw new AppError("Cannot react to a deleted message", 400);
    }

    // Reactions are interactions between the pair — keep them under
    // the same block rules as messaging (direct chats only; group
    // members can always react).
    const chatType = await this.chatRepo.getConversationType(conversationId);
    if (chatType === "direct") {
      const participants = await this.chatRepo.getParticipants(conversationId);
      const otherIds = participants
        .filter(({ user_id }) => String(user_id) !== String(userId))
        .map(({ user_id }) => user_id);
      const blocked = await this.blocksRepo.findBlockedBetween(userId, otherIds);
      if (blocked) {
        throw new AppError("You can't react to messages in this chat.", 403);
      }
    }

    const reactions =
      action === "add"
        ? await this.messageRepo.addReaction(messageId, userId, emoji)
        : await this.messageRepo.removeReaction(messageId, userId, emoji);

    return { messageId, conversationId, reactions, participants };
  }

  // -------------------------------------------------------------
  // Starred messages
  // -------------------------------------------------------------

  // Star/unstar is private to the acting user: the DB row is per-user
  // and the confirmation is emitted only to that user's own devices.
  async setStarred({ conversationId, messageId, userId, starred }) {
    await assertConversationParticipant(conversationId, userId);

    const message = await this.messageRepo.getMessageInConversation(
      conversationId,
      messageId,
    );
    if (!message) {
      throw new AppError("Message not found in this conversation", 404);
    }

    if (starred) {
      await this.messageRepo.starMessage(userId, messageId);
    } else {
      await this.messageRepo.unstarMessage(userId, messageId);
    }

    return { messageId, conversationId, starred: Boolean(starred) };
  }

  async getStarredMessages(userId) {
    return this.messageRepo.getStarredMessages(userId);
  }
}

module.exports = ChatService;
