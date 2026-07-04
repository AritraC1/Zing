const ChatRepo = require("./chat.repo");
const ChatParticipantsRepo = require("../chatParticipants/chatParticipants.repo");
const MessageRepo = require("../messages/messagesRepo");
const AppError = require("../../shared/errors/AppError");
const asyncHandler = require("../../shared/utils/asyncHandler");

// Fetch all conversations for current user
const fetchAllMyConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const conversations = await ChatRepo.getUserConversations(userId);

  return res.status(200).json({
    conversations,
  });
});

// Create or find direct conversation
const createOrFindConversations = asyncHandler(async (req, res) => {
  const { userId } = req.body; // the other user
  const currentUserId = req.user.id; // logged-in user

  if (!userId || !currentUserId) {
    throw new AppError("userId is required", 400);
  }

  if (String(userId) === String(currentUserId)) {
    throw new AppError("Cannot start a conversation with yourself", 400);
  }

  const existingConversation = await ChatRepo.findDirectConversation(
    currentUserId,
    userId,
  );

  if (existingConversation) {
    return res.status(200).json({
      conversationId: existingConversation.conversation_id,
      message: "Conversation already exists",
    });
  }

  const newConversation = await ChatRepo.createConversation("direct");

  await ChatParticipantsRepo.addTwoParticipants(
    newConversation.id,
    currentUserId,
    userId,
  );

  return res.status(201).json({
    conversationId: newConversation.id,
    message: "Conversation created",
  });
});

// Fetch messages for a conversation with pagination
const fetchMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const offset = parseInt(req.query.offset) || 0;

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

  const [messages, statuses] = await Promise.all([
    MessageRepo.getMessagesByConversation(conversationId, 50, offset),
    MessageRepo.getMessageStatusesForConversation(conversationId),
  ]);

  return res.status(200).json({ messages, statuses });
});

module.exports = {
  fetchAllMyConversations,
  createOrFindConversations,
  fetchMessages,
};
