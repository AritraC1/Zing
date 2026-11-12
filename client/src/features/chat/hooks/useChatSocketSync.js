import { useEffect, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import {
  addMessage,
  addOptimisticMessage,
  reconcileMessage,
  markMessageFailed,
  markMessageSending,
  setMessages,
  updateMessageStatus,
  markMessagesRead,
  setPresence,
  setLoadingOlderMessages,
  setTyping,
  applyMessageEdit,
  applyMessageDelete,
  applyReaction,
  applyStar,
  archiveChat,
  unarchiveChat,
  setChatMuted,
  setConversationStatuses,
} from "../store/chatReducer";
import {
  fetchMyChats,
  fetchMessages,
  sendMessageRest,
  editMessageRest,
  deleteMessageRest,
  setReactionRest,
  setStarredRest,
  fetchBlockedUsers,
} from "../api/chatThunk";
import { useSocketContext } from "../../../core/socket/useSocketContext";
import useAuth from "../../auth/hooks/useAuth";
import * as messageDb from "../local/messageDb";
import { LOCAL_PAGE_SIZE } from "../local/messageDb";
import { statusesArrayToMap } from "../store/statusUtils";
import {
  encryptDirectContent,
  decryptDirectContent,
  decryptMessages,
  UNDECRYPTABLE_PLACEHOLDER,
} from "../utils/e2ee";
import { replenishCurrent } from "../../../core/crypto/keyManager";

const PAGE_SIZE = 50;

function collectOutboxMessages(allMessages, userId) {
  const outbox = [];
  Object.entries(allMessages || {}).forEach(([conversationId, msgs]) => {
    (msgs || []).forEach((msg) => {
      if (
        msg.sender_id === userId &&
        (msg.sendStatus === "sending" || msg.sendStatus === "failed")
      ) {
        outbox.push({ ...msg, conversationId });
      }
    });
  });
  return outbox;
}

/**
 * Call once from ChatPage. Owns all socket <-> Redux wiring for chat.
 */
export const useChatSocketSync = ({
  selectedChat,
  chats,
  messages,
  messagePagination,
}) => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useAuth();
  const { socket, emit, isConnected } = useSocketContext();
  const allMessages = useSelector((state) => state.chat.messages);

  const chatsRef = useRef(chats);
  const wasConnectedRef = useRef(isConnected);

  // Latest messages snapshot for the socket handlers below — the
  // effect intentionally doesn't depend on allMessages (it would
  // re-subscribe on every message); a ref keeps the handler current.
  const allMessagesRef = useRef(allMessages);

  // In-progress message edit (shown as a banner in the composer).
  const [editingMessage, setEditingMessage] = useState(null);

  // Message being replied to (quoted above the composer).
  const [replyingMessage, setReplyingMessage] = useState(null);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    allMessagesRef.current = allMessages;
  }, [allMessages]);

  // E2EE (1:1 chats): conversation metadata for the encryption path.
  const getEncryptionContext = useCallback(
    (conversationId) => {
      const chat = (chatsRef.current || []).find(
        (c) => c.id === conversationId,
      );
      // Group chats are passed through unencrypted until Sender Keys;
      // unknown conversations fall through the same way.
      if (!chat || chat.chatType !== "direct" || !chat.otherUserId) {
        return null;
      }
      return { peerUserId: chat.otherUserId };
    },
    [],
  );

  // Turn a plaintext payload into its wire form: E2EE envelope for
  // direct chats, plaintext for groups. Returns null when the
  // conversation cannot be encrypted and the caller should fail the
  // message rather than silently downgrade.
  const buildOutgoingContent = useCallback(
    async (conversationId, content) => {
      const encContext = getEncryptionContext(conversationId);
      if (!encContext) return { content, encrypted: false };

      try {
        const encryptedContent = await encryptDirectContent(
          encContext.peerUserId,
          content,
        );
        return { content: encryptedContent, encrypted: true };
      } catch (error) {
        console.error("[chat] E2EE encryption failed:", error);
        return { error };
      }
    },
    [getEncryptionContext],
  );

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyChats());
      // Mirror the server's block list so sending UI can be disabled
      // and profile actions show the right label.
      dispatch(fetchBlockedUsers());
    }
  }, [dispatch, isAuthenticated]);

  const emitSendPayload = useCallback(
    async (msg, clientMsgId) => {
      const conversationId = msg.conversation_id || msg.conversationId;
      const wire = await buildOutgoingContent(
        conversationId,
        msg.content?.trim() || "",
      );

      if (wire.error) {
        dispatch(markMessageFailed({ clientMsgId, conversationId }));
        toast.error("Could not encrypt this message.");
        return;
      }

      emit("send_message", {
        conversationId,
        clientMsgId,
        content: wire.content,
        mediaId: msg.media_id || msg.mediaId || null,
        msgType: msg.msg_type || msg.msgType || "text",
        forwardedFromId:
          msg.forwarded_from_id || msg.forwardedFromId || null,
        replyToId: msg.reply_to_id || msg.replyToId || null,
      });
    },
    [emit, buildOutgoingContent, dispatch],
  );

  // HTTP fallback so messages still send when the socket is down.
  // A failed REST attempt marks the message failed; the reconnect
  // effect below re-sends anything still in the outbox once the
  // socket is back (WhatsApp-style queueing).
  const sendViaRest = useCallback(
    (conversationId, clientMsgId, msg) => {
      const run = async () => {
        try {
          const wire = await buildOutgoingContent(
            conversationId,
            msg.content?.trim() || "",
          );
          if (wire.error) {
            throw wire.error;
          }

          const result = await dispatch(
            sendMessageRest({
              conversationId,
              clientMsgId,
              content: wire.content,
              mediaId: msg.media_id || msg.mediaId || null,
              msgType: msg.msg_type || msg.msgType || "text",
              forwardedFromId:
                msg.forwarded_from_id || msg.forwardedFromId || null,
              replyToId: msg.reply_to_id || msg.replyToId || null,
            }),
          ).unwrap();

          if (result?.message) {
            // The REST echo carries our own ciphertext back; decrypt
            // via the self-device envelope entry before reconciling.
            const serverMessage = result.message;
            const plaintext = serverMessage?.content
              ? await decryptDirectContent(
                  serverMessage.sender_id,
                  serverMessage.content,
                )
              : null;

            dispatch(
              reconcileMessage({
                clientMsgId,
                serverMessage:
                  plaintext === null || plaintext === undefined
                    ? serverMessage
                    : { ...serverMessage, content: plaintext },
              }),
            );
          }
        } catch (errPayload) {
          dispatch(
            markMessageFailed({ clientMsgId, conversationId }),
          );
          // Surface the server's reason (e.g. "You blocked this
          // contact.") instead of a generic retry prompt when we have it.
          const reason =
            typeof errPayload === "string"
              ? errPayload
              : errPayload?.message ||
                (errPayload?.error
                  ? "Could not encrypt this message."
                  : null) ||
                "Message not delivered yet. Tap to retry.";
          toast.error(reason);
        }
      };
      run();
    },
    [dispatch, buildOutgoingContent],
  );

  const retryMessage = useCallback(
    (clientMsgId, conversationId) => {
      const convId = conversationId || selectedChat?.id;
      if (!convId || !clientMsgId) return;

      const msg = (allMessages[convId] || []).find(
        (m) => m.client_msg_id === clientMsgId,
      );
      if (!msg) return;

      dispatch(markMessageSending({ clientMsgId, conversationId: convId }));

      if (isConnected) {
        emitSendPayload(msg, clientMsgId);
      } else {
        sendViaRest(convId, clientMsgId, msg);
      }
    },
    [
      allMessages,
      selectedChat?.id,
      isConnected,
      dispatch,
      emitSendPayload,
      sendViaRest,
    ],
  );

  useEffect(() => {
    if (!socket) return;

    // E2EE: incoming content in 1:1 chats is an envelope; group chats
    // pass through unchanged. Undecryptable messages show a locked
    // placeholder instead of ciphertext.
    const decryptIncoming = async (message) => {
      if (!message?.content) return message;
      try {
        const plaintext = await decryptDirectContent(
          message.sender_id,
          message.content,
        );
        return plaintext === message.content ? message : { ...message, content: plaintext };
      } catch {
        return message;
      }
    };

    const handleNewMessage = async (message) => {
      if (!message?.id) return;

      const decrypted = await decryptIncoming(message);
      dispatch(addMessage(decrypted));
      messageDb.saveMessages(message.conversation_id, [decrypted]);

      const chatExists = chatsRef.current.some(
        (c) => c.id === message.conversation_id,
      );
      if (!chatExists) {
        dispatch(fetchMyChats());
      }

      emit("message_delivered", {
        messageId: message.id,
        conversationId: message.conversation_id,
      });
    };

    const handleMessageSent = async (message) => {
      if (!message?.id || !message.client_msg_id) return;

      // The echo carries our own ciphertext back; the self-device
      // envelope entry decrypts it so the UI keeps showing plaintext.
      const decrypted = await decryptIncoming(message);
      dispatch(
        reconcileMessage({
          clientMsgId: message.client_msg_id,
          serverMessage: decrypted,
        }),
      );
      messageDb.saveMessages(message.conversation_id, [decrypted]);
    };

    const handleMessageHistory = async (data) => {
      if (!data?.conversationId) return;
      const historyMessages = Array.isArray(data.messages) ? data.messages : [];
      const historyStatuses = Array.isArray(data.statuses) ? data.statuses : [];
      const decrypted = await decryptMessages(historyMessages);
      dispatch(
        setMessages({
          conversationId: data.conversationId,
          messages: decrypted,
          statuses: historyStatuses,
          offset: data.offset || 0,
          hasMore: data.hasMore ?? historyMessages.length === PAGE_SIZE,
        }),
      );

      // Persist the fresh server page into local history.
      messageDb.saveMessages(data.conversationId, decrypted);
      if (historyStatuses.length) {
        messageDb.saveStatuses(
          data.conversationId,
          statusesArrayToMap(historyStatuses),
        );
      }
    };

    const handleMessageDelivered = (data) => {
      const { messageId, deliveredTo, conversationId: convId } = data;
      dispatch(
        updateMessageStatus({
          messageId,
          userId: deliveredTo,
          status: "delivered",
          conversationId: convId,
        }),
      );
      messageDb.saveStatus(convId, messageId, deliveredTo, "delivered");
    };

    const handleMessagesRead = (data) => {
      const { conversationId: convId, messageIds, readBy } = data;
      if (!readBy || !Array.isArray(messageIds)) return;
      messageIds.forEach((messageId) => {
        dispatch(
          updateMessageStatus({
            messageId,
            userId: readBy,
            status: "seen",
            conversationId: convId,
          }),
        );
        messageDb.saveStatus(convId, messageId, readBy, "seen");
      });
    };

    const handlePresenceUpdate = (data) => {
      const { userId, online, lastSeenAt } = data;
      dispatch(setPresence({ userId, online, lastSeenAt }));
    };

    const handleTypingUpdate = (data) => {
      const { conversationId, userId: typingUserId, isTyping } = data;
      dispatch(setTyping({ conversationId, userId: typingUserId, isTyping }));
    };

    const handleMessageEdited = async (data) => {
      if (!data?.messageId || !data?.conversationId) return;

      // Edited content in 1:1 chats is encrypted like the original.
      let content = data.content;
      if (content) {
        try {
          // Only the sender may edit; the server includes their id so
          // receivers can pick the right E2EE session.
          const senderId =
            data.senderId ??
            (allMessagesRef.current[data.conversationId] || []).find(
              (m) => m.id === data.messageId,
            )?.sender_id;

          content = await decryptDirectContent(senderId, content);
        } catch {
          content = UNDECRYPTABLE_PLACEHOLDER;
        }
      }

      dispatch(applyMessageEdit({ ...data, content }));
      messageDb.patchMessage(data.conversationId, data.messageId, {
        content,
        edited_at: data.editedAt || new Date().toISOString(),
      });
    };

    const handleMessageDeleted = (data) => {
      if (!data?.messageId || !data?.conversationId) return;
      dispatch(applyMessageDelete(data));
      messageDb.patchMessage(data.conversationId, data.messageId, {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: null,
        secure_url: null,
      });
    };

    // Another device of this user changed the archive flag — keep
    // local lists in step instead of waiting for the next refetch.
    const handleChatArchived = (data) => {
      const { conversationId, archived } = data;
      if (!conversationId) return;
      if (archived) {
        dispatch(archiveChat(conversationId));
      } else {
        dispatch(unarchiveChat(conversationId));
      }
    };

    // Another device toggled this conversation's mute flag.
    const handleChatMuted = (data) => {
      const { conversationId, muted } = data;
      if (!conversationId) return;
      dispatch(setChatMuted({ conversationId, muted }));
    };

    // Group membership / metadata changes (`group:update`) are handled
    // app-wide by ChatGlobalSync — this hook unmounts when the user
    // navigates away from /chat, so listening here would miss events.

    // Reaction list broadcast: the server sends the message's complete,
    // ordered reaction list — replace wholesale.
    const handleMessageReactionUpdated = (data) => {
      if (!data?.messageId || !data?.conversationId) return;
      dispatch(
        applyReaction({
          conversationId: data.conversationId,
          messageId: data.messageId,
          reactions: data.reactions,
        }),
      );
      messageDb.patchMessage(data.conversationId, data.messageId, {
        reactions: data.reactions,
      });
    };

    // Star state is per-user; the server echoes to this user's devices
    // only. Other users' stars are never seen here.
    const handleMessageStarred = (data) => {
      if (!data?.messageId || !data?.conversationId) return;
      dispatch(
        applyStar({
          conversationId: data.conversationId,
          messageId: data.messageId,
          starred: true,
        }),
      );
      messageDb.patchMessage(data.conversationId, data.messageId, {
        starred_by_me: true,
      });
    };

    const handleMessageUnstarred = (data) => {
      if (!data?.messageId || !data?.conversationId) return;
      dispatch(
        applyStar({
          conversationId: data.conversationId,
          messageId: data.messageId,
          starred: false,
        }),
      );
      messageDb.patchMessage(data.conversationId, data.messageId, {
        starred_by_me: false,
      });
    };

    const handleSocketError = (data) => {
      const message = data?.message || "Something went wrong";
      if (data?.clientMsgId && data?.conversationId) {
        dispatch(
          markMessageFailed({
            clientMsgId: data.clientMsgId,
            conversationId: data.conversationId,
          }),
        );
      }
      toast.error(message);
    };

    // Server says one of this user's devices is low on one-time
    // prekeys (probably this one): upload a fresh batch.
    const handleKeysLow = () => {
      replenishCurrent().catch((error) =>
        console.error("[chat] prekey replenish failed:", error),
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_sent", handleMessageSent);
    socket.on("message_history", handleMessageHistory);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("messages_read", handleMessagesRead);
    socket.on("presence_update", handlePresenceUpdate);
    socket.on("typing_update", handleTypingUpdate);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("message_reaction_updated", handleMessageReactionUpdated);
    socket.on("message_starred", handleMessageStarred);
    socket.on("message_unstarred", handleMessageUnstarred);
    socket.on("chat_archived", handleChatArchived);
    socket.on("chat_muted", handleChatMuted);
    socket.on("keys:low", handleKeysLow);
    socket.on("error", handleSocketError);

    // Ask the server who is already online right now — otherwise users
    // that connected before this client would show as offline/never
    // "last seen" until their next reconnect.
    emit("presence_snapshot");

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_sent", handleMessageSent);
      socket.off("message_history", handleMessageHistory);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("messages_read", handleMessagesRead);
      socket.off("presence_update", handlePresenceUpdate);
      socket.off("typing_update", handleTypingUpdate);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("message_reaction_updated", handleMessageReactionUpdated);
      socket.off("message_starred", handleMessageStarred);
      socket.off("message_unstarred", handleMessageUnstarred);
      socket.off("chat_archived", handleChatArchived);
      socket.off("chat_muted", handleChatMuted);
      socket.off("keys:low", handleKeysLow);
      socket.off("error", handleSocketError);
    };
  }, [socket, dispatch, emit]);

  // Opening a chat: paint instantly from local history (IndexedDB),
  // then sync the newest page from the server on top (covers messages
  // missed while offline and refreshes pagination state).
  useEffect(() => {
    if (!selectedChat) return;

    let cancelled = false;

    const openConversation = async () => {
      const conversationId = selectedChat.id;

      try {
        const [localMessages, localStatuses] = await Promise.all([
          messageDb.loadRecentMessages(conversationId, LOCAL_PAGE_SIZE),
          messageDb.loadStatuses(conversationId),
        ]);

        if (!cancelled && localMessages.length > 0) {
          dispatch(
            setMessages({
              conversationId,
              messages: localMessages,
              statuses: undefined,
              offset: 0,
              hasMore: localMessages.length === LOCAL_PAGE_SIZE,
              isLocal: true,
              // Hydration replaces the list; the imminent server
              // page-0 response re-anchors this count.
              serverCount: 0,
            }),
          );
          if (localStatuses) {
            dispatch(
              setConversationStatuses({ conversationId, statuses: localStatuses }),
            );
          }
        }
      } catch {
        // Local cache is an optimization — never block the server sync.
      }

      if (cancelled) return;

      if (isConnected) {
        emit("fetch_messages", { conversationId, offset: 0 });
      } else {
        dispatch(fetchMessages({ conversationId, offset: 0 }))
          .unwrap()
          .then((payload) => {
            messageDb.saveMessages(conversationId, payload?.messages);
          })
          .catch(() => {});
      }
    };

    openConversation();

    return () => {
      cancelled = true;
    };
  }, [selectedChat?.id, isConnected, emit, dispatch]);

  // An edit session belongs to one conversation — switching chats
  // cancels it so the composer banner never points at stale content.
  // (Derived in MessageInput from the selected chat instead of a
  // setState-in-effect, which cascades renders.)

  // Don't leak a pending "stopped typing" timer across mounts.
  useEffect(
    () => () => {
      clearTimeout(typingStopTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!selectedChat || !isConnected) return;
    emit("mark_read", { conversationId: selectedChat.id });
    dispatch(markMessagesRead({ conversationId: selectedChat.id }));
  }, [selectedChat?.id, isConnected, emit, dispatch]);

  useEffect(() => {
    const reconnected = isConnected && !wasConnectedRef.current;
    wasConnectedRef.current = isConnected;

    if (!reconnected || !user?.id) return;

    const outbox = collectOutboxMessages(allMessages, user.id);
    outbox.forEach((msg) => {
      dispatch(
        markMessageSending({
          clientMsgId: msg.client_msg_id,
          conversationId: msg.conversationId,
        }),
      );
      emitSendPayload(msg, msg.client_msg_id);
    });

    // Re-sync presence after a reconnect — the server may have missed
    // our disconnect (or another login may have gone offline since).
    emit("presence_snapshot");
  }, [isConnected, user?.id, allMessages, dispatch, emitSendPayload, emit]);

  const sendMessage = useCallback(
    async (payload) => {
      if (!selectedChat || !user?.id) return;

      const content = typeof payload === "string" ? payload : payload?.content;
      const mediaId = typeof payload === "object" ? payload?.mediaId : null;
      const msgType = payload?.msgType || (mediaId ? "media" : "text");
      const mimeType = typeof payload === "object" ? payload?.mimeType : null;
      const previewUrl = typeof payload === "object" ? payload?.previewUrl : null;
      const forwardedFromId =
        typeof payload === "object" ? payload?.forwardedFromId || null : null;
      // Reply/quote: the hook owns the replying state (MessageInput shows
      // the banner); it is cleared once the send is queued.
      const replyToId =
        (typeof payload === "object" ? payload?.replyToId || null : null) ||
        (replyingMessage?.conversation_id === selectedChat?.id
          ? replyingMessage.id
          : null);

      if ((!content || !content.trim()) && !mediaId) return;

      const clientMsgId = uuidv4();
      const trimmedContent = content?.trim() || "";

      setReplyingMessage(null);

      dispatch(
        addOptimisticMessage({
          client_msg_id: clientMsgId,
          conversation_id: selectedChat.id,
          sender_id: user.id,
          content: trimmedContent,
          media_id: mediaId,
          msg_type: msgType,
          forwarded_from_id: forwardedFromId,
          reply_to_id: replyToId,
          // Local preview so the sender sees the image/audio immediately,
          // before the server echo brings the real secure_url.
          mime_type: mimeType,
          secure_url: previewUrl || null,
          created_at: new Date().toISOString(),
        }),
      );

      if (isConnected) {
        // E2EE: the socket payload carries an encrypted envelope for
        // direct chats (plaintext for groups). buildOutgoingContent
        // marks the message failed instead of downgrading to plaintext.
        const wire = await buildOutgoingContent(selectedChat.id, trimmedContent);
        if (wire.error) {
          dispatch(
            markMessageFailed({ clientMsgId, conversationId: selectedChat.id }),
          );
          toast.error("Could not encrypt this message.");
          return;
        }

        emit("send_message", {
          conversationId: selectedChat.id,
          clientMsgId,
          content: wire.content,
          mediaId,
          msgType,
          forwardedFromId,
          replyToId,
        });
      } else {
        // Socket unavailable — send over HTTP in the background. The
        // optimistic message stays in "sending" state (clock icon) and
        // is automatically re-sent if it fails and the socket reconnects.
        sendViaRest(
          selectedChat.id,
          clientMsgId,
          {
            content: trimmedContent,
            media_id: mediaId,
            msg_type: msgType,
            forwarded_from_id: forwardedFromId,
            reply_to_id: replyToId,
          },
        );
      }
    },
    [
      selectedChat,
      user,
      isConnected,
      dispatch,
      emit,
      sendViaRest,
      buildOutgoingContent,
      replyingMessage,
    ],
  );

  // Typing indicator: emit start on the first keystroke, then a stop
  // after a short idle window (the server also relays these to peers).
  const sendTyping = useCallback(
    (isTyping) => {
      if (!selectedChat || !isConnected) return;
      emit("typing", { conversationId: selectedChat.id, isTyping });
    },
    [selectedChat, isConnected, emit],
  );

  // Keeps the "stopped typing" emit exactly once per idle window.
  const typingStopTimerRef = useRef(null);

  // ----- Message editing -----

  const startEdit = useCallback((message) => {
    if (!message?.id || message.is_deleted) return;
    setEditingMessage(message);
  }, []);

  const cancelEdit = useCallback(() => setEditingMessage(null), []);

  // ----- Replies / quoting -----

  const startReply = useCallback((message) => {
    if (!message?.id || message.is_deleted) return;
    setReplyingMessage(message);
  }, []);

  const cancelReply = useCallback(() => setReplyingMessage(null), []);

  // ----- Reactions -----
  // Optimistic toggle; the server broadcast (or REST response) then
  // replaces the list with the canonical ordered one.

  const reactToMessage = useCallback(
    (message, emoji) => {
      if (!message?.id || !user?.id || !emoji) return;
      const conversationId = message.conversation_id;
      if (!conversationId) return;

      const reactions = message.reactions || [];
      const mine = reactions.some(
        (r) => r.userId === user.id && r.emoji === emoji,
      );
      const action = mine ? "remove" : "add";

      const optimistic = mine
        ? reactions.filter(
            (r) => !(r.userId === user.id && r.emoji === emoji),
          )
        : [
            ...reactions,
            { userId: user.id, emoji, createdAt: new Date().toISOString() },
          ];

      dispatch(
        applyReaction({
          conversationId,
          messageId: message.id,
          reactions: optimistic,
        }),
      );

      const revert = () =>
        dispatch(
          applyReaction({
            conversationId,
            messageId: message.id,
            reactions,
          }),
        );

      if (isConnected) {
        emit("react_to_message", {
          conversationId,
          messageId: message.id,
          emoji,
          action,
        });
      } else {
        dispatch(
          setReactionRest({
            conversationId,
            messageId: message.id,
            emoji,
            action,
          }),
        )
          .unwrap()
          .then((res) =>
            dispatch(
              applyReaction({
                conversationId,
                messageId: message.id,
                reactions: res?.reactions,
              }),
            ),
          )
          .catch(() => {
            revert();
            toast.error("Could not update reaction. Try again.");
          });
      }
    },
    [user, isConnected, dispatch, emit],
  );

  // ----- Starred messages -----
  // Per-user bookmark: optimistic flip, reconciled by the server echo.

  const toggleStar = useCallback(
    (message) => {
      if (!message?.id) return;
      const conversationId = message.conversation_id;
      if (!conversationId) return;

      const starred = !message.starred_by_me;

      dispatch(
        applyStar({
          conversationId,
          messageId: message.id,
          starred,
        }),
      );

      if (isConnected) {
        emit("star_message", {
          conversationId,
          messageId: message.id,
          starred,
        });
      } else {
        dispatch(
          setStarredRest({
            conversationId,
            messageId: message.id,
            starred,
          }),
        ).unwrap().catch(() =>
          toast.error("Could not update star. Try again."),
        );
      }
    },
    [isConnected, dispatch, emit],
  );

    const submitEdit = useCallback(
    async (newContent) => {
      if (!editingMessage?.id || !newContent?.trim()) return;
      const conversationId = editingMessage.conversation_id;
      const messageId = editingMessage.id;

      setEditingMessage(null);

      const applyLocal = (plaintext) =>
        dispatch(
          applyMessageEdit({
            conversationId,
            messageId,
            content: plaintext,
            editedAt: new Date().toISOString(),
          }),
        );

      if (isConnected) {
        // 1:1 chats: edits are encrypted with the same per-device
        // envelope scheme; the echo is decrypted by the handler below.
        const wire = await buildOutgoingContent(conversationId, newContent.trim());
        if (wire.error) {
          toast.error("Could not encrypt this edit.");
          return;
        }
        applyLocal(newContent.trim());
        emit("edit_message", {
          conversationId,
          messageId,
          content: wire.content,
        });
        return;
      }

      const wire = await buildOutgoingContent(conversationId, newContent.trim());
      if (wire.error) {
        toast.error("Could not encrypt this edit.");
        return;
      }

      dispatch(
        editMessageRest({ conversationId, messageId, content: wire.content }),
      )
        .unwrap()
        .then(() => {
          applyLocal(newContent.trim());
        })
        .catch(() => toast.error("Could not edit message. Try again."));
    },
    [
      editingMessage,
      isConnected,
      emit,
      dispatch,
      buildOutgoingContent,
    ],
  );

  // Soft-delete for everyone in the conversation.
  const deleteMessage = useCallback(
    (message) => {
      const conversationId = message?.conversation_id || selectedChat?.id;
      const messageId = message?.id;
      if (!conversationId || !messageId) return;

      if (isConnected) {
        emit("delete_message", { conversationId, messageId });
        return;
      }

      dispatch(deleteMessageRest({ conversationId, messageId }))
        .unwrap()
        .then(() => {
          dispatch(applyMessageDelete({ conversationId, messageId }));
        })
        .catch(() => toast.error("Could not delete message. Try again."));
    },
    [selectedChat, isConnected, emit, dispatch],
  );

  // Forward a message into a (possibly different) conversation. Uses
  // the same send pipeline with forwardedFromId so the server stores
  // the provenance and recipients see the "Forwarded" label.
  const forwardMessageTo = useCallback(
    (targetConversationId, message) => {
      if (!targetConversationId || !message || !user?.id) return;

      const content = message.content || "";
      const mediaId = message.media_id || null;
      const msgType = message.msg_type || (mediaId ? "media" : "text");
      const clientMsgId = uuidv4();

      dispatch(
        addOptimisticMessage({
          client_msg_id: clientMsgId,
          conversation_id: targetConversationId,
          sender_id: user.id,
          content,
          media_id: mediaId,
          msg_type: msgType,
          forwarded_from_id: message.id,
          mime_type: message.mime_type || null,
          secure_url: message.secure_url || null,
          created_at: new Date().toISOString(),
        }),
      );

      const restPayload = {
        content,
        media_id: mediaId,
        msg_type: msgType,
        forwarded_from_id: message.id,
      };

      if (isConnected) {
        (async () => {
          // Same encryption path as normal sends: forwarded plaintext
          // is re-encrypted for the target conversation's devices.
          const wire = await buildOutgoingContent(
            targetConversationId,
            content,
          );
          if (wire.error) {
            dispatch(
              markMessageFailed({
                clientMsgId,
                conversationId: targetConversationId,
              }),
            );
            toast.error("Could not encrypt this message.");
            return;
          }

          emit("send_message", {
            conversationId: targetConversationId,
            clientMsgId,
            content: wire.content,
            mediaId,
            msgType,
            forwardedFromId: message.id,
          });
        })();
      } else {
        sendViaRest(targetConversationId, clientMsgId, restPayload);
      }
    },
    [user, isConnected, emit, dispatch, sendViaRest, buildOutgoingContent],
  );

  const markAsRead = useCallback(() => {
    if (!selectedChat) return;
    if (isConnected) {
      emit("mark_read", { conversationId: selectedChat.id });
    }
    dispatch(markMessagesRead({ conversationId: selectedChat.id }));
  }, [selectedChat, isConnected, emit, dispatch]);

  // Scroll-up pagination: IndexedDB first (instant, offline-friendly),
  // then the server for anything the local cache doesn't hold. The
  // server offset is `serverCount` — the number of messages already
  // loaded from the server — not the list length, since the list may
  // also contain locally-cached pages.
  const loadOlderMessages = useCallback(() => {
    if (!selectedChat || messagePagination.loadingOlder) return;
    if (!messagePagination.hasMore) return;

    const conversationId = selectedChat.id;

    dispatch(
      setLoadingOlderMessages({
        conversationId,
        loading: true,
      }),
    );

    const load = async () => {
      // Oldest server-loaded message (optimistic echoes have no
      // sequence_no and are skipped by the query).
      const oldest = (messages || []).find((m) => m?.sequence_no != null);

      try {
        if (oldest) {
          const localOlder = await messageDb.loadOlderMessages(
            conversationId,
            oldest.sequence_no,
            PAGE_SIZE,
          );

          if (localOlder.length > 0) {
            dispatch(
              setMessages({
                conversationId,
                messages: localOlder,
                offset: 1,
                hasMore: true,
                isLocal: true,
              }),
            );
            // A full local page was found — more may exist; done for
            // this scroll. A partial page falls through to the server
            // so history never silently stops early.
            if (localOlder.length === PAGE_SIZE) return;
          }
        }
      } catch {
        // fall through to the server
      }

      const serverOffset = messagePagination.serverCount || 0;

      if (isConnected) {
        emit("fetch_messages", { conversationId, offset: serverOffset });
      } else {
        dispatch(
          fetchMessages({ conversationId, offset: serverOffset }),
        )
          .unwrap()
          .then((payload) => {
            messageDb.saveMessages(conversationId, payload?.messages);
          })
          .catch(() => {});
      }
    };

    load();
  }, [
    selectedChat,
    isConnected,
    messagePagination,
    messages,
    emit,
    dispatch,
  ]);

  return {
    sendMessage,
    markAsRead,
    loadOlderMessages,
    retryMessage,
    sendTyping,
    editingMessage,
    startEdit,
    cancelEdit,
    submitEdit,
    deleteMessage,
    forwardMessageTo,
    replyToMessage: replyingMessage,
    startReply,
    cancelReply,
    reactToMessage,
    toggleStar,
  };
};
