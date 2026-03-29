const ChatRepo = require("./chat.repo");
const ChatParticipantsRepo = require("../chatParticipants/chatParticipants.repo");
const MessageRepo = require("../messages/messagesRepo");

const fetchAllMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;
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

const createOrFindConversations = async (req, res) => {
  try {
    const { userId } = req.body; // the other user
    const currentUserId = req.user.id;

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

const fetchMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const offset = parseInt(req.query.offset) || 0;

    const messages = await MessageRepo.getMessagesByConversation(
      conversationId,
      50,
      offset,
    );

    return res.status(200).json({ messages });
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
