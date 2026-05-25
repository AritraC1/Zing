// Chat Socket

// manages live chat communication between users by -
// Tracking who is online
// Sending/receiving messages instantly
// Fetching chat history
// Marking messages as read
// Tracking message delivery and seen status

const MessageRepo = require("../messages/messagesRepo");
const ChatRepo = require("./chat.repo");

// Map to track online users: userId -> socketId
const onlineUsers = new Map();

module.exports = (io) => {
  io.on("connection", async (socket) => {
    const userId = socket.user.id; // already attached by checkSocketForJwt middleware
    onlineUsers.set(userId, socket.id); // Store the user's socket ID so we can send messages to them later

    try {
      const deliveredRows = await MessageRepo.markAllPendingAsDelivered(userId);

      deliveredRows.forEach(({ message_id, sender_id }) => {
        const recipientSocketId = onlineUsers.get(sender_id);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("message_delivered", {
            messageId: message_id,
            deliveredTo: userId,
          });
        }
      });
    } catch (err) {
      console.error("Error updating pending deliveries on connection:", err);
    }

    socket.on("fetch_messages", async ({ conversationId, offset = 0 }) => {
      try {
        const messages = await MessageRepo.getMessagesByConversation(
          conversationId,
          50,
          offset,
        );

        const statuses = await MessageRepo.getMessageStatusesForConversation(
          conversationId,
        );

        socket.emit("message_history", { conversationId, messages, statuses });
      } catch (err) {
        socket.emit("error", { message: "Failed to fetch messages" });
      }
    });

    socket.on(
      "send_message",
      async ({
        conversationId,
        content,
        clientMsgId,
        msgType,
        mediaId,
        forwardedFromId,
      }) => {
        // Allow sending if either content or mediaId is present
        if (!conversationId || (!content?.trim() && !mediaId)) {
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

          const message = await MessageRepo.saveMessage({
            conversationId,
            senderId: userId,
            content,
            clientMsgId,
            msgType,
            mediaId,
            forwardedFromId,
          });

          const recipientIds = participants
            .filter(({ user_id }) => user_id !== userId)
            .map(({ user_id }) => user_id);

          await MessageRepo.initializeMessageStatuses(message.id, recipientIds);
          await ChatRepo.updateLastMessage(conversationId);

          participants.forEach(({ user_id }) => {
            if (user_id !== userId) {
              const recipientSocketId = onlineUsers.get(user_id);
              if (recipientSocketId) {
                io.to(recipientSocketId).emit("new_message", message);
              } else {
                console.log("Recipient not online:", { userId: user_id });
              }
            }
          });

          socket.emit("message_sent", message);
        } catch (err) {
          socket.emit("error", {
            message: err.message || "Failed to send message",
          });
        }
      },
    );

    socket.on("message_delivered", async ({ messageId, conversationId }) => {
      try {
        const updated = await MessageRepo.updateMessageStatus(
          messageId,
          userId,
          "delivered",
        );

        if (!updated.length) {
          return;
        }

        const participants = await ChatRepo.getParticipants(conversationId);
        participants.forEach(({ user_id }) => {
          if (user_id !== userId) {
            const recipientSocketId = onlineUsers.get(user_id);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit("message_delivered", {
                messageId,
                deliveredTo: userId,
              });
            }
          }
        });
      } catch (err) {
        console.error("message_delivered error:", err);
      }
    });

    socket.on("mark_read", async ({ conversationId }) => {
      try {
        const updatedRows = await MessageRepo.markConversationAsSeen(
          conversationId,
          userId,
        );

        const participants = await ChatRepo.getParticipants(conversationId);

        participants.forEach(({ user_id }) => {
          if (user_id !== userId) {
            const recipientSocketId = onlineUsers.get(user_id);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit("messages_read", {
                conversationId,
                messageIds: updatedRows.map((row) => row.message_id),
              });
            }
          }
        });
      } catch (err) {
        console.error("mark_read error:", err);
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
    });
  });
};
