import { useEffect, useCallback, useRef } from "react";
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
} from "../store/chatReducer";
import { fetchMyChats, fetchMessages } from "../api/chatThunk";
import { useSocketContext } from "../../../core/socket/useSocketContext";
import useAuth from "../../auth/hooks/useAuth";

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

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyChats());
    }
  }, [dispatch, isAuthenticated]);

  const emitSendPayload = useCallback(
    (msg, clientMsgId) => {
      emit("send_message", {
        conversationId: msg.conversation_id || msg.conversationId,
        clientMsgId,
        content: msg.content?.trim() || "",
        mediaId: msg.media_id || msg.mediaId || null,
        msgType: msg.msg_type || msg.msgType || "text",
      });
    },
    [emit],
  );

  const retryMessage = useCallback(
    (clientMsgId, conversationId) => {
      const convId = conversationId || selectedChat?.id;
      if (!convId || !clientMsgId) return;

      const msg = (allMessages[convId] || []).find(
        (m) => m.client_msg_id === clientMsgId,
      );
      if (!msg) return;

      if (!isConnected) {
        toast.error("Still offline. Connect and try again.");
        return;
      }

      dispatch(markMessageSending({ clientMsgId, conversationId: convId }));
      emitSendPayload(msg, clientMsgId);
    },
    [allMessages, selectedChat?.id, isConnected, dispatch, emitSendPayload],
  );

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (!message?.id) return;
      dispatch(addMessage(message));

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

    const handleMessageSent = (message) => {
      if (!message?.id || !message.client_msg_id) return;
      dispatch(
        reconcileMessage({
          clientMsgId: message.client_msg_id,
          serverMessage: message,
        }),
      );
    };

    const handleMessageHistory = (data) => {
      if (!data?.conversationId) return;
      const historyMessages = Array.isArray(data.messages) ? data.messages : [];
      const historyStatuses = Array.isArray(data.statuses) ? data.statuses : [];
      dispatch(
        setMessages({
          conversationId: data.conversationId,
          messages: historyMessages,
          statuses: historyStatuses,
          offset: data.offset || 0,
          hasMore: data.hasMore ?? historyMessages.length === PAGE_SIZE,
        }),
      );
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
      });
    };

    const handlePresenceUpdate = (data) => {
      const { userId, online, lastSeenAt } = data;
      dispatch(setPresence({ userId, online, lastSeenAt }));
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

    socket.on("new_message", handleNewMessage);
    socket.on("message_sent", handleMessageSent);
    socket.on("message_history", handleMessageHistory);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("messages_read", handleMessagesRead);
    socket.on("presence_update", handlePresenceUpdate);
    socket.on("error", handleSocketError);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_sent", handleMessageSent);
      socket.off("message_history", handleMessageHistory);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("messages_read", handleMessagesRead);
      socket.off("presence_update", handlePresenceUpdate);
      socket.off("error", handleSocketError);
    };
  }, [socket, dispatch, emit]);

  useEffect(() => {
    if (!selectedChat) return;

    if (isConnected) {
      emit("fetch_messages", { conversationId: selectedChat.id, offset: 0 });
    } else {
      dispatch(
        fetchMessages({ conversationId: selectedChat.id, offset: 0 }),
      );
    }
  }, [selectedChat?.id, isConnected, emit, dispatch]);

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
  }, [isConnected, user?.id, allMessages, dispatch, emitSendPayload]);

  const sendMessage = useCallback(
    (payload) => {
      if (!selectedChat || !user?.id) return;

      const content = typeof payload === "string" ? payload : payload?.content;
      const mediaId = typeof payload === "object" ? payload?.mediaId : null;
      const msgType = payload?.msgType || (mediaId ? "media" : "text");

      if ((!content || !content.trim()) && !mediaId) return;

      const clientMsgId = uuidv4();
      const trimmedContent = content?.trim() || "";

      dispatch(
        addOptimisticMessage({
          client_msg_id: clientMsgId,
          conversation_id: selectedChat.id,
          sender_id: user.id,
          content: trimmedContent,
          media_id: mediaId,
          msg_type: msgType,
          created_at: new Date().toISOString(),
        }),
      );

      if (!isConnected) {
        dispatch(
          markMessageFailed({
            clientMsgId,
            conversationId: selectedChat.id,
          }),
        );
        toast.error("You're offline. Tap retry when connected.");
        return;
      }

      emit("send_message", {
        conversationId: selectedChat.id,
        clientMsgId,
        content: trimmedContent,
        mediaId,
        msgType,
      });
    },
    [selectedChat, user?.id, isConnected, dispatch, emit],
  );

  const markAsRead = useCallback(() => {
    if (!selectedChat) return;
    if (isConnected) {
      emit("mark_read", { conversationId: selectedChat.id });
    }
    dispatch(markMessagesRead({ conversationId: selectedChat.id }));
  }, [selectedChat, isConnected, emit, dispatch]);

  const loadOlderMessages = useCallback(() => {
    if (!selectedChat || messagePagination.loadingOlder) return;
    if (!messagePagination.hasMore) return;

    dispatch(
      setLoadingOlderMessages({
        conversationId: selectedChat.id,
        loading: true,
      }),
    );

    if (isConnected) {
      emit("fetch_messages", {
        conversationId: selectedChat.id,
        offset: messages.length,
      });
    } else {
      dispatch(
        fetchMessages({
          conversationId: selectedChat.id,
          offset: messages.length,
        }),
      );
    }
  }, [
    selectedChat,
    isConnected,
    messagePagination,
    messages.length,
    emit,
    dispatch,
  ]);

  return { sendMessage, markAsRead, loadOlderMessages, retryMessage };
};
