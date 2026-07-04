const ChatRepo = require("./chat.repo");
const AppError = require("../../shared/errors/AppError");

async function assertConversationParticipant(conversationId, userId) {
  const participants = await ChatRepo.getParticipants(conversationId);

  if (!participants.length) {
    throw new AppError("Conversation not found", 404);
  }

  const isParticipant = participants.some(
    ({ user_id }) => String(user_id) === String(userId),
  );

  if (!isParticipant) {
    throw new AppError("Forbidden: not a participant", 403);
  }

  return participants;
}

module.exports = { assertConversationParticipant };
