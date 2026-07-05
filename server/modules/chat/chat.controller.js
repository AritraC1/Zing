const ChatRepo = require("./chat.repo");
const ChatService = require("./chat.service");
const MessageRepo = require("../messages/messagesRepo");
const asyncHandler = require("../../shared/utils/asyncHandler");
const { assertConversationParticipant } = require("./chat.access");
const { buildMediaUrl } = require("../../shared/utils/mediaUrl");

const PAGE_SIZE = 50;

const fetchAllMyConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const rows = await ChatRepo.getUserConversations(userId);
  const conversations = rows.map((row) => ({
    ...row,
    otherUserAvatarUrl: row.otherUserAvatarKey
      ? buildMediaUrl(row.otherUserAvatarKey)
      : null,
  }));

  return res.status(200).json({
    conversations,
  });
});

const createOrFindConversations = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const currentUserId = req.user.id;

  const result = await ChatService.createDirectConversation(
    currentUserId,
    userId,
  );

  return res.status(result.created ? 201 : 200).json({
    conversationId: result.conversationId,
    message: result.created
      ? "Conversation created"
      : "Conversation already exists",
  });
});

const fetchMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const offset = parseInt(req.query.offset, 10) || 0;

  await assertConversationParticipant(conversationId, userId);

  const [messages, statuses] = await Promise.all([
    MessageRepo.getMessagesByConversation(conversationId, PAGE_SIZE, offset),
    MessageRepo.getMessageStatusesForConversation(conversationId),
  ]);

  return res.status(200).json({
    messages,
    statuses,
    offset,
    hasMore: messages.length === PAGE_SIZE,
  });
});

module.exports = {
  fetchAllMyConversations,
  createOrFindConversations,
  fetchMessages,
};
