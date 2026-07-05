const ChatRepo = require("./chat.repo");
const ChatParticipantsRepo = require("../chatParticipants/chatParticipants.repo");
const AppError = require("../../shared/errors/AppError");
const { withTransaction } = require("../../shared/utils/withTransaction");

class ChatService {
  static async createDirectConversation(currentUserId, otherUserId) {
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

      const newConversation = await ChatRepo.createConversation("direct", client);

      await ChatParticipantsRepo.addTwoParticipants(
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
