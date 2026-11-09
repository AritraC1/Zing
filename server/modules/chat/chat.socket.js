// Chat Socket

// manages live chat communication between users by -
// Tracking who is online
// Sending/receiving messages instantly
// Fetching chat history
// Marking messages as read
// Tracking message delivery and seen status

const MessageRepository = require("../messages/messages.repository");
const ChatRepository = require("./chat.repository");
const UserRepository = require("../users/users.repository");
const { assertConversationParticipant } = require("./chat.access");
const { validate: uuidValidate } = require("uuid");
const { setIo } = require("./chat.events");
const {
  addSocketForUser,
  removeSocketForUser,
  getOnlineUserIds,
  userRoom,
} = require("../../core/sockets/presence");

const PAGE_SIZE = 50;
const userRepo = new UserRepository();
const messageRepo = new MessageRepository();
const chatRepo = new ChatRepository();

function broadcastPresence(io, userId, online, lastSeenAt = null) {
  io.emit("presence_update", { userId, online, lastSeenAt });
}

module.exports = (io) => {
  // Share the io instance so REST endpoints can also fan out events.
  setIo(io);

  io.on("connection", async (socket) => {
    const userId = socket.user.id;

    socket.join(userRoom(userId));
    const wentOnline = addSocketForUser(socket, userId);

    try {
      if (wentOnline) broadcastPresence(io, userId, true);
      await userRepo.updateLastSeen(userId);

      // Deliver messages that were queued while this user was offline.
      // 'conversation_id' must be included so the client can update
      // the message status in the right conversation.
      const deliveredRows = await messageRepo.markAllPendingAsDelivered(userId);

      deliveredRows.forEach(
        ({ message_id, sender_id, conversation_id }) => {
          io.to(userRoom(sender_id)).emit("message_delivered", {
            messageId: message_id,
            conversationId: conversation_id,
            deliveredTo: userId,
          });
        },
      );
    } catch (err) {
      console.error("Error updating pending deliveries on connection:", err);
    }

    // Presence snapshot: a freshly connected client has no idea which
    // users came online before it existed (those broadcasts went to
    // nobody it could hear). Replay the current online set on request
    // as normal presence_update events so the same reducer handles it.
    socket.on("presence_snapshot", () => {
      // The shared presence registry lives in core/sockets/presence.js and
      // doubles as the online map for the call socket module.
      getOnlineUserIds()
        .filter((id) => id !== userId)
        .forEach((id) => {
          socket.emit("presence_update", { userId: id, online: true });
        });
    });

    socket.on("fetch_messages", async ({ conversationId, offset = 0 }) => {
      try {
        await assertConversationParticipant(conversationId, userId);

        const messages = await messageRepo.getMessagesByConversation(
          conversationId,
          PAGE_SIZE,
          offset,
        );

        const statuses = await messageRepo.getMessageStatusesForConversation(
          conversationId,
        );

        socket.emit("message_history", {
          conversationId,
          messages,
          statuses,
          offset,
          hasMore: messages.length === PAGE_SIZE,
        });
      } catch (err) {
        console.error("fetch_messages error:", err.message);
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

          // Idempotency: the same clientMsgId may arrive twice (retry /
          // reconnect flush). Never store or emit it twice.
          const existing = await messageRepo.getMessageByClientId(
            userId,
            clientMsgId,
          );
          if (existing) {
            socket.emit("message_sent", existing);
            return;
          }

          const participants = await chatRepo.getParticipants(conversationId);

          const message = await messageRepo.saveMessage({
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

          await messageRepo.initializeMessageStatuses(message.id, recipientIds);
          await chatRepo.updateLastMessage(conversationId);

          // Fan out to every device/tab of every participant — including
          // the sender's other devices — so all sessions stay in sync.
          // The message is always persisted first, so an offline recipient
          // will still receive it on their next connection via
          // markAllPendingAsDelivered. read receipts for the sender's own
          // status rows simply no-op server-side.
          participants.forEach(({ user_id }) => {
            io.to(userRoom(user_id)).emit("new_message", message);
          });

          socket.emit("message_sent", message);
        } catch (err) {
          console.error("send_message error:", err.message);
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
        await assertConversationParticipant(conversationId, userId);

        const updated = await messageRepo.updateMessageStatus(
          messageId,
          userId,
          "delivered",
        );

        if (!updated.length) {
          return;
        }

        const participants = await chatRepo.getParticipants(conversationId);
        participants.forEach(({ user_id }) => {
          if (user_id !== userId) {
            io.to(userRoom(user_id)).emit("message_delivered", {
              messageId,
              deliveredTo: userId,
              conversationId,
            });
          }
        });
      } catch (err) {
        console.error("message_delivered error:", err);
        if (err.statusCode === 403) {
          socket.emit("error", {
            message: "Not a participant in this conversation",
          });
        }
      }
    });

    socket.on("mark_read", async ({ conversationId }) => {
      try {
        await assertConversationParticipant(conversationId, userId);

        const updatedRows = await messageRepo.markConversationAsSeen(
          conversationId,
          userId,
        );

        const participants = await chatRepo.getParticipants(conversationId);

        participants.forEach(({ user_id }) => {
          if (user_id !== userId) {
            io.to(userRoom(user_id)).emit("messages_read", {
              conversationId,
              readBy: userId,
              messageIds: updatedRows.map((row) => row.message_id),
            });
          }
        });
      } catch (err) {
        console.error("mark_read error:", err);
        if (err.statusCode === 403) {
          socket.emit("error", {
            message: "Not a participant in this conversation",
          });
        }
      }
    });

    socket.on("disconnect", () => {
      const wentOffline = removeSocketForUser(socket, userId);
      if (!wentOffline) return; // another tab/device is still connected

      (async () => {
        try {
          const lastSeenAt = await userRepo.updateLastSeen(userId);
          broadcastPresence(io, userId, false, lastSeenAt);
        } catch (err) {
          console.error("Error updating last seen on disconnect:", err);
          broadcastPresence(io, userId, false);
        }
      })();
    });
  });
};
