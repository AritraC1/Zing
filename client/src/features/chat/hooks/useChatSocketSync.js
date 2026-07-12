import { useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  addMessage,
  setMessages,
  updateMessageStatus,
  markMessagesRead,
  setPresence,
  setLoadingOlderMessages,
} from "../store/chatReducer";
import { fetchMyChats } from "../api/chatThunk";
import { useSocketContext } from "../../../core/socket/useSocketContext";
import useAuth from "../../auth/hooks/useAuth";

const PAGE_SIZE = 50;

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
  const { isAuthenticated } = useAuth();
  const { socket, emit, isConnected } = useSocketContext();

  const chatsRef = useRef(chats);
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyChats());
    }
  }, [dispatch, isAuthenticated]);

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
      if (message?.id) dispatch(addMessage(message));
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

    socket.on("new_message", handleNewMessage);
    socket.on("message_sent", handleMessageSent);
    socket.on("message_history", handleMessageHistory);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("messages_read", handleMessagesRead);
    socket.on("presence_update", handlePresenceUpdate);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_sent", handleMessageSent);
      socket.off("message_history", handleMessageHistory);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("messages_read", handleMessagesRead);
      socket.off("presence_update", handlePresenceUpdate);
    };
  }, [socket, dispatch, emit]);

  useEffect(() => {
    if (!selectedChat || !isConnected) return;
    emit("fetch_messages", { conversationId: selectedChat.id, offset: 0 });
  }, [selectedChat?.id, isConnected, emit]);

  useEffect(() => {
    if (!selectedChat || !isConnected) return;
    emit("mark_read", { conversationId: selectedChat.id });
    dispatch(markMessagesRead({ conversationId: selectedChat.id }));
  }, [selectedChat?.id, isConnected, emit, dispatch]);

  const sendMessage = useCallback(
    (payload) => {
      if (!selectedChat) return;
      const content = typeof payload === "string" ? payload : payload?.content;
      const mediaId = typeof payload === "object" ? payload?.mediaId : null;
      if ((!content || !content.trim()) && !mediaId) return;

      emit("send_message", {
        conversationId: selectedChat.id,
        content: content?.trim() || "",
        mediaId,
        msgType: payload?.msgType,
      });
    },
    [selectedChat, emit],
  );

  const markAsRead = useCallback(() => {
    if (!selectedChat) return;
    emit("mark_read", { conversationId: selectedChat.id });
    dispatch(markMessagesRead({ conversationId: selectedChat.id }));
  }, [selectedChat, emit, dispatch]);

  const loadOlderMessages = useCallback(() => {
    if (!selectedChat || !isConnected || messagePagination.loadingOlder) return;
    if (!messagePagination.hasMore) return;

    dispatch(
      setLoadingOlderMessages({
        conversationId: selectedChat.id,
        loading: true,
      }),
    );

    emit("fetch_messages", {
      conversationId: selectedChat.id,
      offset: messages.length,
    });
  }, [
    selectedChat,
    isConnected,
    messagePagination,
    messages.length,
    emit,
    dispatch,
  ]);

  return { sendMessage, markAsRead, loadOlderMessages };
};
