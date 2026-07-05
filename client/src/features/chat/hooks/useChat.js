import { useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectChat,
  setTab,
  archiveChat,
  unarchiveChat,
  addMessage,
  setMessages,
  setLoadingOlderMessages,
  updateMessageStatus,
  markMessagesRead,
  setPresence,
  clearCalls,
} from "../store/chatReducer";
import {
  selectSortedChats,
  selectMessagesForChat,
  selectStatusesForChat,
  selectMessagePagination,
  selectPresenceForUser,
} from "../store/chatSelectors";
import { getMessageStatus } from "../store/statusUtils";
import useAuth from "../../auth/hooks/useAuth";
import { fetchMyChats } from "../api/chatThunk";
import { useSocket } from "../../../shared/hooks/useSocket";

const PAGE_SIZE = 50;

export const useChat = () => {
  const dispatch = useDispatch();
  const {
    archivedChats,
    selectedChat,
    tab,
    calls,
  } = useSelector((state) => state.chat);
  const chats = useSelector(selectSortedChats);
  const conversationId = selectedChat?.id;
  const messages = useSelector((state) =>
    selectMessagesForChat(state, conversationId),
  );
  const statuses = useSelector((state) =>
    selectStatusesForChat(state, conversationId),
  );
  const messagePagination = useSelector((state) =>
    selectMessagePagination(state, conversationId),
  );
  const otherUserPresence = useSelector((state) =>
    selectPresenceForUser(state, selectedChat?.otherUserId),
  );
  const { emit, isConnected, on, off } = useSocket();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleNewMessage = (message) => {
      if (message && message.id) {
        dispatch(addMessage(message));

        const chatExists = chats.some((c) => c.id === message.conversation_id);
        if (!chatExists) {
          dispatch(fetchMyChats());
        }

        emit("message_delivered", {
          messageId: message.id,
          conversationId: message.conversation_id,
        });
      }
    };

    const handleMessageSent = (message) => {
      if (message && message.id) {
        dispatch(addMessage(message));
      }
    };

    const handleMessageHistory = (data) => {
      if (data && data.conversationId) {
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

    on("new_message", handleNewMessage);
    on("message_sent", handleMessageSent);
    on("message_history", handleMessageHistory);
    on("message_delivered", handleMessageDelivered);
    on("messages_read", handleMessagesRead);
    on("presence_update", handlePresenceUpdate);

    return () => {
      off("new_message", handleNewMessage);
      off("message_sent", handleMessageSent);
      off("message_history", handleMessageHistory);
      off("message_delivered", handleMessageDelivered);
      off("messages_read", handleMessagesRead);
      off("presence_update", handlePresenceUpdate);
    };
  }, [dispatch, emit, on, off, chats]);

  useEffect(() => {
    if (!selectedChat || !isConnected) return;

    emit("fetch_messages", { conversationId: selectedChat.id, offset: 0 });
  }, [selectedChat?.id, isConnected, emit]);

  useEffect(() => {
    if (!selectedChat || !isConnected) return;

    emit("mark_read", { conversationId: selectedChat.id });
    dispatch(markMessagesRead({ conversationId: selectedChat.id }));
  }, [selectedChat?.id, isConnected, emit, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyChats());
    }
  }, [dispatch, isAuthenticated]);

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
    if (selectedChat) {
      emit("mark_read", { conversationId: selectedChat.id });
      dispatch(markMessagesRead({ conversationId: selectedChat.id }));
    }
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

  const getStatusForMessage = useCallback(
    (message) => {
      if (!selectedChat?.otherUserId) return null;
      return getMessageStatus(
        statuses,
        message.id,
        selectedChat.otherUserId,
      );
    },
    [statuses, selectedChat],
  );

  return {
    chats,
    archivedChats,
    selectedChat,
    tab,
    messages,
    statuses,
    messagePagination,
    otherUserPresence,
    calls,

    setTab: (t) => dispatch(setTab(t)),
    selectChat: (chat) => dispatch(selectChat(chat)),
    archiveChat: (id) => dispatch(archiveChat(id)),
    unarchiveChat: (id) => dispatch(unarchiveChat(id)),
    sendMessage,
    markAsRead,
    loadOlderMessages,
    getStatusForMessage,
    clearCalls: () => dispatch(clearCalls()),
  };
};
