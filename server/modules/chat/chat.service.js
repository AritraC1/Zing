const ChatRepo = require("./chat.repository");
const ParticipantsRepository = require("./participants.repository");
const AppError = require("../../core/errors/AppError");
const { withTransaction } = require("../../utils/withTransaction");

class ChatService {
  constructor() {
    // Repos with static methods are called statically (see auth.service.js)
  }

  async createDirectConversation(currentUserId, otherUserId) {
    if (String(otherUserId) === String(currentUserId)) {
      throw new AppError("Cannot start a conversation with yourself", 400);
    }

    const existingConversation = await ChatRepo.findDirectConversation(
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
      const raceExisting = await ChatRepo.findDirectConversation(
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

      const newConversation = await ChatRepo.createConversation(
        "direct",
        client,
      );

      await ParticipantsRepository.addTwoParticipants(
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
}

module.exports = ChatService;
