// manages live chat communication between users by:
// Tracking who is online
// Sending/receiving messages instantly
// Fetching chat history
// Marking messages as read

const MessageRepo = require("../messages/messagesRepo");
const ChatRepo = require("./chat.repo");

const onlineUsers = new Map();

module.exports = (io) => {
  // Connect
  io.on("connection", (socket) => {
    const userId = socket.user.id; // already attached by checkSocketForJwt middleware
    onlineUsers.set(userId, socket.id);
    console.log(`User connected: ${userId}`);

    // Fetch message history
    socket.on("fetch_messages", async ({ conversationId, offset = 0 }) => {
      try {
        const messages = await MessageRepo.getMessagesByConversation(
          conversationId,
          50,
          offset,
        );
        socket.emit("message_history", { conversationId, messages });
      } catch (err) {
        socket.emit("error", { message: "Failed to fetch messages" });
      }
    });

    // Send Message
    socket.on("send_message", async ({ conversationId, content }) => {
      if (!conversationId || !content?.trim()) {
        console.error('❌ Invalid send_message:', { conversationId, content });
        return;
      }

      try {
        const participants = await ChatRepo.getParticipants(conversationId);

        if (!participants.length) {
          throw new Error("Conversation not found");
        }

        const isParticipant = participants.some(
          ({ user_id }) => user_id === userId,
        );

        if (!isParticipant) {
          throw new Error("You are not a participant in this conversation");
        }

        const message = await MessageRepo.saveMessage(
          conversationId,
          userId,
          content,
        );
        console.log('✅ Message saved to DB:', { messageId: message.id, conversationId });
        
        await ChatRepo.updateLastMessage(conversationId);

        // Emit to other participants
        participants.forEach(({ user_id }) => {
          if (user_id !== userId) {
            const recipientSocketId = onlineUsers.get(user_id);
            if (recipientSocketId) {
              console.log('🔴 Sending new_message to recipient:', { recipientSocketId, messageId: message.id });
              io.to(recipientSocketId).emit("new_message", message);
            } else {
              console.log('⚠️ Recipient not online:', { userId: user_id });
            }
          }
        });

        // Send confirmation back to sender
        console.log('✅ Sending message_sent to sender:', { messageId: message.id });
        socket.emit("message_sent", message);
      } catch (err) {
        console.error("❌ send_message error:", err.message);
        socket.emit("error", { message: err.message || "Failed to send message" });
      }
    });

    // Mark Message
    socket.on("mark_read", async ({ conversationId }) => {
      try {
        await MessageRepo.markAsRead(conversationId, userId);

        const participants = await ChatRepo.getParticipants(conversationId);
        participants.forEach(({ user_id }) => {
          if (user_id !== userId) {
            const recipientSocketId = onlineUsers.get(user_id);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit("messages_read", {
                conversationId,
              });
            }
          }
        });
      } catch (err) {
        console.error("mark_read error:", err);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      console.log(`User disconnected: ${userId}`);
    });
  });
};
