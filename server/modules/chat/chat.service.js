const ChatRepository = require("./chat.repository");
const ParticipantsRepository = require("./participants.repository");
const MessageRepository = require("../messages/messages.repository");
const { assertConversationParticipant } = require("./chat.access");
const { buildMediaUrl } = require("../../utils/mediaUrl");
const { withTransaction } = require("../../utils/withTransaction");
const AppError = require("../../core/errors/AppError");

const PAGE_SIZE = 50;

class ChatService {
  constructor() {
    this.chatRepo = new ChatRepository();
    this.participantsRepository = new ParticipantsRepository();
    this.messageRepo = new MessageRepository();
  }

  // Get all conversations for the current user with the other participant's details
  async getMyConversations(userId) {
    const rows = await this.chatRepo.getUserConversations(userId);

    return rows.map((row) => ({
      ...row,
      otherUserAvatarUrl: row.otherUserAvatarKey
        ? buildMediaUrl(row.otherUserAvatarKey)
        : null,
    }));
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

  // Fetch messages for a conversation after verifying the user is a participant
  async getMessages(conversationId, userId, offset = 0) {
    await assertConversationParticipant(conversationId, userId);

    const [messages, statuses] = await Promise.all([
      this.messageRepo.getMessagesByConversation(
        conversationId,
        PAGE_SIZE,
        offset,
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
}

module.exports = ChatService;
