const ChatRepo = require("./chat.repo");
const ChatParticipantsRepo = require("../chatParticipants/chatParticipants.repo");
const MessageRepo = require("../messages/messagesRepo");

// Fetch all conversations for current user
const fetchAllMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all conversations where this user is a participant
    const conversations = await ChatRepo.getUserConversations(userId);

    return res.status(200).json({
      conversations,
    });
  } catch (error) {
    console.log("Error: ", error);
    res.status(500).json({
      message: "Unable to fetch conversations",
    });
  }
};

// Create or find direct conversation
const createOrFindConversations = async (req, res) => {
  try {
    const { userId } = req.body; // the other user
    const currentUserId = req.user.id; // logged-in user

    if (!userId || !currentUserId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Check if conversation already exists
    const existingConversation = await ChatRepo.findDirectConversation(
      currentUserId,
      userId,
    );

    // If Exists
    if (existingConversation) {
      return res.status(200).json({
        conversationId: existingConversation.conversation_id,
        message: "Conversation already exists",
      });
    }

    // If not exists, then create a conversation
    const newConversation = await ChatRepo.createConversation("direct");

    // Add participants
    await ChatParticipantsRepo.addTwoParticipants(
      newConversation.id,
      currentUserId,
      userId,
    );

    return res.status(201).json({
      conversationId: newConversation.id,
      message: "Conversation created",
    });
  } catch (error) {
    console.log("Error: ", error);
    res.status(500).json({
      message: "Unable to find or create new chat",
    });
  }
};

// Fetch messages for a conversation with pagination
const fetchMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const offset = parseInt(req.query.offset) || 0; // pagination offset

    // Get messages (limit = 50 per request) and their delivery statuses
    const [messages, statuses] = await Promise.all([
      MessageRepo.getMessagesByConversation(conversationId, 50, offset),
      MessageRepo.getMessageStatusesForConversation(conversationId),
    ]);

    return res.status(200).json({ messages, statuses });
  } catch (error) {
    console.log("Error: ", error);
    res.status(500).json({ message: "Unable to fetch messages" });
  }
};

module.exports = {
  fetchAllMyConversations,
  createOrFindConversations,
  fetchMessages,
};
