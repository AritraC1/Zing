const ChatService = require("./chat.service");
const { notifyNewMessage, notifyEvent } = require("./chat.events");
const pushService = require("../notifications/push.service");
const { validate: uuidValidate } = require("uuid");

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
  // POST /api/chats/conversation/:conversationId/messages
  // HTTP fallback for sending a message when the socket is disconnected.
  sendMessage = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { content, clientMsgId, msgType, mediaId, forwardedFromId, replyToId } =
        req.body || {};

      if (!conversationId || (!content?.trim() && !mediaId)) {
        return res.status(400).json({
          message: "content or mediaId is required",
        });
      }
      if (!clientMsgId) {
        return res.status(400).json({ message: "clientMsgId is required" });
      }

      const { message, created, participants } =
        await this.chatService.sendMessage({
          conversationId,
          userId,
          content,
          clientMsgId,
          msgType: msgType || (mediaId ? "media" : "text"),
          mediaId,
          forwardedFromId,
          replyToId: replyToId || null,
        });

      // Inform every participant's devices (offline ones catch up on
      // next connect).
      if (created) {
        const participantIds = participants.map(({ user_id }) => user_id);
        notifyNewMessage(message, participantIds);

        // Wake offline devices (best-effort; skips online + muted users).
        pushService
          .notifyNewMessage({
            message,
            recipientIds: participantIds,
            senderId: userId,
          })
          .catch(() => {});
      }

      return res.status(200).json({ message, created });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/chats/conversation/:conversationId/messages/:messageId
  editMessage = async (req, res, next) => {
    try {
      const { conversationId, messageId } = req.params;
      const userId = req.user.id;
      const { content } = req.body || {};

      if (
        !uuidValidate(conversationId) ||
        !uuidValidate(messageId) ||
        !content?.trim()
      ) {
        return res.status(400).json({ message: "Invalid edit request" });
      }

      const { message: updated, participants } =
        await this.chatService.editMessage({
          conversationId,
          messageId,
          userId,
          content: content.trim(),
        });

      // Tell every participant's devices (including the sender's other
      // tabs) so all sessions show the edited bubble.
      notifyEvent(
        "message_edited",
        {
          messageId,
          conversationId,
          content: updated.content,
          editedAt: updated.edited_at,
        },
        participants.map(({ user_id }) => user_id),
      );

      return res.status(200).json({
        messageId,
        conversationId,
        content: updated.content,
        editedAt: updated.edited_at,
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/chats/conversation/:conversationId/messages/:messageId
  deleteMessage = async (req, res, next) => {
    try {
      const { conversationId, messageId } = req.params;
      const userId = req.user.id;

      if (!uuidValidate(conversationId) || !uuidValidate(messageId)) {
        return res.status(400).json({ message: "Invalid delete request" });
      }

      const { participants } = await this.chatService.deleteMessage({
        conversationId,
        messageId,
        userId,
      });

      notifyEvent(
        "message_deleted",
        { messageId, conversationId },
        participants.map(({ user_id }) => user_id),
      );

      return res.status(200).json({ messageId, conversationId });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/chats/conversation/:conversationId/archive
  setArchive = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { archived } = req.body || {};

      if (!uuidValidate(conversationId) || typeof archived !== "boolean") {
        return res.status(400).json({
          message: "conversationId and archived (boolean) are required",
        });
      }

      const result = await this.chatService.setArchived(
        conversationId,
        userId,
        archived,
      );

      // Sync the sender's other devices; the recipient's archive flag
      // is per-user and unaffected.
      notifyEvent(
        "chat_archived",
        { conversationId, archived: result.archived },
        [userId],
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/chats/conversation/:conversationId/mute
  setMute = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { muted } = req.body || {};

      if (!uuidValidate(conversationId) || typeof muted !== "boolean") {
        return res.status(400).json({
          message: "conversationId and muted (boolean) are required",
        });
      }

      const result = await this.chatService.setMuted(
        conversationId,
        userId,
        muted,
      );

      // Sync the sender's other devices; mute is per-user and does not
      // affect the other participant.
      notifyEvent(
        "chat_muted",
        { conversationId, muted: result.muted },
        [userId],
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // PUT/DELETE /api/chats/conversation/:conversationId/messages/:messageId/reaction
  setReaction = async (req, res, next) => {
    try {
      const { conversationId, messageId } = req.params;
      const userId = req.user.id;
      const { emoji, action } = req.body || {};

      if (!uuidValidate(conversationId) || !uuidValidate(messageId)) {
        return res.status(400).json({ message: "Invalid reaction request" });
      }

      const result = await this.chatService.setReaction({
        conversationId,
        messageId,
        userId,
        emoji,
        action,
      });

      // Sync every participant's devices (including the reactor's other
      // tabs) exactly like edits/deletes do.
      const { reactions, participants } = result;
      notifyEvent(
        "message_reaction_updated",
        { messageId, conversationId, reactions },
        participants.map(({ user_id }) => user_id),
      );

      return res
        .status(200)
        .json({ messageId, conversationId, reactions });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/chats/conversation/:conversationId/messages/:messageId/star
  setStarred = async (req, res, next) => {
    try {
      const { conversationId, messageId } = req.params;
      const userId = req.user.id;
      const { starred } = req.body || {};

      if (!uuidValidate(conversationId) || !uuidValidate(messageId)) {
        return res.status(400).json({ message: "Invalid star request" });
      }

      const result = await this.chatService.setStarred({
        conversationId,
        messageId,
        userId,
        starred,
      });

      // Starred state is per-user: sync only this user's other devices.
      notifyEvent(
        starred ? "message_starred" : "message_unstarred",
        result,
        [userId],
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/chats/starred-messages
  fetchStarredMessages = async (req, res, next) => {
    try {
      const starred = await this.chatService.getStarredMessages(req.user.id);
      return res.status(200).json({ starredMessages: starred });
    } catch (error) {
      next(error);
    }
  };
}

const chatController = new ChatController();

module.exports = { ChatController, chatController };
