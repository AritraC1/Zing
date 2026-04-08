// Chat Socket

// manages live chat communication between users by -
// Tracking who is online
// Sending/receiving messages instantly
// Fetching chat history
// Marking messages as read

const MessageRepo = require("../messages/messagesRepo");
const ChatRepo = require("./chat.repo");

// Map to track online users: userId -> socketId
const onlineUsers = new Map();

module.exports = (io) => {
  // Connect
  io.on("connection", (socket) => {
    const userId = socket.user.id; // already attached by checkSocketForJwt middleware
    onlineUsers.set(userId, socket.id); // Store the user's socket ID so we can send messages to them later

    // Fetch message history
    socket.on("fetch_messages", async ({ conversationId, offset = 0 }) => {
      try {
        const messages = await MessageRepo.getMessagesByConversation(
          conversationId,
          50, // pagination (limit = 50)
          offset,
        );

        // Send messages back to the requesting client
        socket.emit("message_history", { conversationId, messages });
      } catch (err) {
        // Notify client if something goes wrong
        socket.emit("error", { message: "Failed to fetch messages" });
      }
    });

    // Send Message
    socket.on("send_message", async ({ conversationId, content }) => {
      if (!conversationId || !content?.trim()) {
        return;
      }

      try {
        // Get all users in this conversation
        const participants = await ChatRepo.getParticipants(conversationId);

        if (!participants.length) {
          throw new Error("Conversation not found");
        }

        // Check if current user is part of this conversation
        const isParticipant = participants.some(
          ({ user_id }) => user_id === userId,
        );

        if (!isParticipant) {
          throw new Error("You are not a participant in this conversation");
        }

        // Save the message in DB
        const message = await MessageRepo.saveMessage(
          conversationId,
          userId,
          content,
        );

        // Update conversation's last message metadata
        await ChatRepo.updateLastMessage(conversationId);

        // Emit to other participants
        participants.forEach(({ user_id }) => {
          if (user_id !== userId) {
            // Check if recipient is online
            const recipientSocketId = onlineUsers.get(user_id);
            if (recipientSocketId) {
              // Send message in real-time to the recipient
              io.to(recipientSocketId).emit("new_message", message);
            } else {
              // Recipient is offline (could trigger push notification here)
              console.log("Recipient not online:", { userId: user_id });
            }
          }
        });

        // Send confirmation back to sender
        socket.emit("message_sent", message);
      } catch (err) {
        socket.emit("error", {
          message: err.message || "Failed to send message",
        });
      }
    });

    // Mark Message
    socket.on("mark_read", async ({ conversationId }) => {
      try {
        // Mark all messages in this conversation as read for this user
        await MessageRepo.markAsRead(conversationId, userId);

        // Notify other participants that messages were read
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
      // Remove user from online users map when they disconnect
      onlineUsers.delete(userId);
    });
  });
};
