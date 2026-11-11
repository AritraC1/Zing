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
const BlocksRepository = require("../blocks/blocks.repository");
const ChatService = require("./chat.service");
const { assertConversationParticipant } = require("./chat.access");
const { validate: uuidValidate } = require("uuid");
const { setIo } = require("./chat.events");
const {
  addSocketForUser,
  removeSocketForUser,
  getOnlineUserIds,
  userRoom,
} = require("../../core/sockets/presence");
const pushService = require("../notifications/push.service");

const PAGE_SIZE = 50;
const userRepo = new UserRepository();
const messageRepo = new MessageRepository();
const chatRepo = new ChatRepository();
const blocksRepo = new BlocksRepository();
const chatService = new ChatService();

function broadcastPresence(io, userId, online, lastSeenAt = null) {
  io.emit("presence_update", { userId, online, lastSeenAt });
}

// ---------------------------------------------------------------
// Server-side typing state. The client already falls back to its own
// timeout when no stop event arrives, but a typer whose tab dies
// abruptly otherwise leaves a stale "typing…" until that local timer
// fires — and reconnecting peers replay nothing to correct it. The
// server tracks every active typing session and (a) force-clears a
// session after a short idle window with no refresh and (b) clears all
// of a user's sessions when their last socket disconnects.
// ---------------------------------------------------------------
const TYPING_IDLE_MS = 6 * 1000;
// userId -> Map<conversationId, NodeJS.Timeout>
const typingTimers = new Map();

function getTypingConversationsForUser(userId) {
  let conversations = typingTimers.get(userId);
  if (!conversations) {
    conversations = new Map();
    typingTimers.set(userId, conversations);
  }
  return conversations;
}

// Tell the conversation that this user stopped typing and forget the
// session (idempotent: safe to call twice).
async function clearTyping(io, userId, conversationId) {
  const conversations = typingTimers.get(userId);
  if (!conversations) return;
  const timer = conversations.get(conversationId);
  if (timer) {
    clearTimeout(timer);
    conversations.delete(conversationId);
  } else {
    return; // already cleared — don't emit a duplicate stop
  }

  try {
    const participants = await chatRepo.getParticipants(conversationId);
    participants.forEach(({ user_id }) => {
      if (String(user_id) !== String(userId)) {
        io.to(userRoom(user_id)).emit("typing_update", {
          conversationId,
          userId,
          isTyping: false,
        });
      }
    });
  } catch (err) {
    console.error("clearTyping error:", err.message);
  }
}

function clearAllTyping(io, userId) {
  const conversations = typingTimers.get(userId);
  if (!conversations) return;
  Array.from(conversations.keys()).forEach((conversationId) => {
    clearTyping(io, userId, conversationId);
  });
  typingTimers.delete(userId);
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
    // With Redis enabled the registry is cluster-wide, so this also
    // covers users connected to other Node instances.
    socket.on("presence_snapshot", () => {
      getOnlineUserIds()
        .then((ids) =>
          ids.filter((id) => id !== userId).forEach((id) => {
            socket.emit("presence_update", { userId: id, online: true });
          }),
        )
        .catch((err) =>
          console.error("presence_snapshot error:", err.message),
        );
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
        replyToId,
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

          // A reply must quote a message in the same conversation
          // (same rule as the REST fallback path).
          if (replyToId) {
            const replyTarget = await messageRepo.getMessageInConversation(
              conversationId,
              replyToId,
            );
            if (!replyTarget) {
              socket.emit("error", {
                message: "Reply target not found in this conversation",
                clientMsgId,
                conversationId,
              });
              return;
            }
          }

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

          // A block in either direction stops message delivery for the pair.
          const otherIds = participants
            .filter(({ user_id }) => String(user_id) !== String(userId))
            .map(({ user_id }) => user_id);
          const blocked = await blocksRepo.findBlockedBetween(userId, otherIds);
          if (blocked) {
            const youBlocked =
              String(blocked.blocker_id) === String(userId);
            socket.emit("error", {
              message: youBlocked
                ? "You blocked this contact. Unblock them to send messages."
                : "You can't send messages to this contact.",
              clientMsgId,
              conversationId,
            });
            return;
          }

          const message = await messageRepo.saveMessage({
            conversationId,
            senderId: userId,
            content,
            clientMsgId,
            msgType,
            mediaId,
            forwardedFromId,
            replyToId: replyToId || null,
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

          // Wake devices with no live socket (best-effort, skips online
          // and muted recipients). Never blocks the send path.
          pushService.notifyNewMessage({
            message,
            recipientIds: recipientIds,
            senderId: userId,
          }).catch(() => {});
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

    // Typing indicators. The sender's own devices are excluded. Each
    // "still typing" refresh re-arms a server-side idle timer
    // (TYPING_IDLE_MS) that force-clears the indicator if the typer
    // stops sending events — covers a tab killed mid-sentence, a
    // dropped socket, or a crashed client without a stop event.
    socket.on("typing", async ({ conversationId, isTyping }) => {
      if (!conversationId) return;

      try {
        await assertConversationParticipant(conversationId, userId);

        if (isTyping) {
          const conversations = getTypingConversationsForUser(userId);
          const existing = conversations.get(conversationId);
          if (existing) {
            clearTimeout(existing);
          }
          const timer = setTimeout(() => {
            clearTyping(io, userId, conversationId);
          }, TYPING_IDLE_MS);
          conversations.set(conversationId, timer);
        } else {
          await clearTyping(io, userId, conversationId);
        }

        const participants = await chatRepo.getParticipants(conversationId);
        participants.forEach(({ user_id }) => {
          if (String(user_id) !== String(userId)) {
            io.to(userRoom(user_id)).emit("typing_update", {
              conversationId,
              userId,
              isTyping: Boolean(isTyping),
            });
          }
        });
      } catch (err) {
        console.error("typing error:", err.message);
      }
    });

    // Edit a message. Only the sender may edit, only text messages.
    socket.on("edit_message", async ({ conversationId, messageId, content }) => {
      try {
        if (
          !conversationId ||
          !messageId ||
          !uuidValidate(messageId) ||
          !content?.trim()
        ) {
          socket.emit("error", { message: "Invalid edit request" });
          return;
        }

        await assertConversationParticipant(conversationId, userId);

        const updated = await messageRepo.editMessage(
          messageId,
          userId,
          content.trim(),
        );

        if (!updated) {
          socket.emit("error", {
            message: "Message not found or cannot be edited",
            conversationId,
          });
          return;
        }

        const participants = await chatRepo.getParticipants(conversationId);
        participants.forEach(({ user_id }) => {
          io.to(userRoom(user_id)).emit("message_edited", {
            messageId,
            conversationId,
            content: updated.content,
            editedAt: updated.edited_at,
          });
        });
      } catch (err) {
        console.error("edit_message error:", err.message);
        socket.emit("error", {
          message: err.message || "Failed to edit message",
          conversationId,
        });
      }
    });

    // Delete a message for everyone. Soft delete server-side; the
    // content is cleared so the plaintext never outlives the deletion.
    socket.on("delete_message", async ({ conversationId, messageId }) => {
      try {
        if (!conversationId || !messageId || !uuidValidate(messageId)) {
          socket.emit("error", { message: "Invalid delete request" });
          return;
        }

        await assertConversationParticipant(conversationId, userId);

        const deleted = await messageRepo.deleteMessage(messageId, userId);

        if (!deleted) {
          socket.emit("error", {
            message: "Message not found or already deleted",
            conversationId,
          });
          return;
        }

        const participants = await chatRepo.getParticipants(conversationId);
        participants.forEach(({ user_id }) => {
          io.to(userRoom(user_id)).emit("message_deleted", {
            messageId,
            conversationId,
          });
        });
      } catch (err) {
        console.error("delete_message error:", err.message);
        socket.emit("error", {
          message: err.message || "Failed to delete message",
          conversationId,
        });
      }
    });

    // Add/remove an emoji reaction. The service enforces participant +
    // block rules and the emoji palette; the resulting reaction list is
    // broadcast to every participant's devices so all sessions agree.
    socket.on("react_to_message", async ({ conversationId, messageId, emoji, action }) => {
      try {
        if (!conversationId || !messageId || !uuidValidate(messageId)) {
          socket.emit("error", { message: "Invalid reaction request" });
          return;
        }

        const result = await chatService.setReaction({
          conversationId,
          messageId,
          userId,
          emoji,
          action,
        });

        const participants = await chatRepo.getParticipants(conversationId);
        participants.forEach(({ user_id }) => {
          io.to(userRoom(user_id)).emit("message_reaction_updated", {
            messageId,
            conversationId,
            reactions: result.reactions,
          });
        });
      } catch (err) {
        console.error("react_to_message error:", err.message);
        socket.emit("error", {
          message: err.message || "Failed to react to message",
          conversationId,
        });
      }
    });

    // Star / unstar a message (per-user bookmark). The confirmation is
    // emitted to this user's own devices only — nobody else's state
    // changes, and other users' stars are private.
    socket.on("star_message", async ({ conversationId, messageId, starred }) => {
      try {
        if (!conversationId || !messageId || !uuidValidate(messageId)) {
          socket.emit("error", { message: "Invalid star request" });
          return;
        }

        const result = await chatService.setStarred({
          conversationId,
          messageId,
          userId,
          starred: Boolean(starred),
        });

        io.to(userRoom(userId)).emit(
          result.starred ? "message_starred" : "message_unstarred",
          {
            messageId,
            conversationId,
            starred: result.starred,
          },
        );
      } catch (err) {
        console.error("star_message error:", err.message);
        socket.emit("error", {
          message: err.message || "Failed to star message",
          conversationId,
        });
      }
    });

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
      // Kill any live typing indicators from this user first — their
      // device is gone and can never emit the stop event itself.
      clearAllTyping(io, userId);

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
