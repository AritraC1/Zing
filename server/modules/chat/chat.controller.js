const ChatService = require("./chat.service");

class ChatController {
  constructor(chatService = new ChatService()) {
    this.chatService = chatService;
  }

  // GET /api/chat/my-conversations
  fetchAllMyConversations = async (req, res, next) => {
    try {
      const userId = req.user.id;

      const conversations = await this.chatService.getMyConversations(userId);

      return res.status(200).json({
        conversations,
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/chat/create-find-conversation
  createOrFindConversations = async (req, res, next) => {
    try {
      const { userId } = req.body;
      const currentUserId = req.user.id;

      const result = await this.chatService.createDirectConversation(
        currentUserId,
        userId,
      );

      return res.status(result.created ? 201 : 200).json({
        conversationId: result.conversationId,
        message: result.created
          ? "Conversation created"
          : "Conversation already exists",
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/chat/conversation/:conversationId/messages
  fetchMessages = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const offset = parseInt(req.query.offset, 10) || 0;

      const data = await this.chatService.getMessages(
        conversationId,
        userId,
        offset,
      );

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}

const chatController = new ChatController();

module.exports = { ChatController, chatController };
