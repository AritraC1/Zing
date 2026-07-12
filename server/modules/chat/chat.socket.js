// Chat Socket

// manages live chat communication between users by -
// Tracking who is online
// Sending/receiving messages instantly
// Fetching chat history
// Marking messages as read
// Tracking message delivery and seen status

const MessageRepo = require("../messages/messagesRepo");
const ChatRepo = require("./chat.repo");
const UserRepo = require("../users/users.repo");
const { assertConversationParticipant } = require("./chat.access");
const { validate: uuidValidate } = require("uuid");

const PAGE_SIZE = 50;

// Map to track online users: userId -> socketId
const onlineUsers = new Map();

function broadcastPresence(io, userId, online, lastSeenAt = null) {
  io.emit("presence_update", { userId, online, lastSeenAt });
}

module.exports = (io) => {
  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);

    try {
      await UserRepo.updateLastSeen(userId);
      broadcastPresence(io, userId, true);

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
        await assertConversationParticipant(conversationId, userId);

        const messages = await MessageRepo.getMessagesByConversation(
          conversationId,
          PAGE_SIZE,
          offset,
        );

        const statuses =
          await MessageRepo.getMessageStatusesForConversation(conversationId);

        socket.emit("message_history", {
          conversationId,
          messages,
          statuses,
          offset,
          hasMore: messages.length === PAGE_SIZE,
        });
      } catch (err) {
        socket.emit("error", {
          message: "Failed to fetch messages",
          conversationId,
        });
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
          socket.emit("error", {
            message: "conversationId and content or mediaId are required",
            clientMsgId,
            conversationId,
          });
          return;
        }

        if (!clientMsgId || !uuidValidate(clientMsgId)) {
          socket.emit("error", {
            message: "Invalid or missing clientMsgId",
            clientMsgId,
            conversationId,
          });
          return;
        }

        try {
          await assertConversationParticipant(conversationId, userId);

          const existing = await MessageRepo.getMessageByClientId(
            userId,
            clientMsgId,
          );
          if (existing) {
            socket.emit("message_sent", existing);
            return;
          }

          const participants = await ChatRepo.getParticipants(conversationId);

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
            clientMsgId,
            conversationId,
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
                conversationId,
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
                readBy: userId,
                messageIds: updatedRows.map((row) => row.message_id),
              });
            }
          }
        });
      } catch (err) {
        console.error("mark_read error:", err);
      }
    });

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      try {
        const lastSeenAt = await UserRepo.updateLastSeen(userId);
        broadcastPresence(io, userId, false, lastSeenAt);
      } catch (err) {
        console.error("Error updating last seen on disconnect:", err);
        broadcastPresence(io, userId, false);
      }
    });
  });
};
