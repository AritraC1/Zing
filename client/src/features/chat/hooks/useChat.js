// client/src/features/chat/hooks/useChat.js
import { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectChat,
  setTab,
  archiveChat,
  unarchiveChat,
  markMessagesRead,
  clearCalls,
  setLoadingOlderMessages,
} from "../store/chatReducer";
import {
  selectSortedChats,
  selectMessagesForChat,
  selectStatusesForChat,
  selectMessagePagination,
  selectPresenceForUser,
} from "../store/chatSelectors";
import { getMessageStatus } from "../store/statusUtils";

export const useChat = () => {
  const dispatch = useDispatch();
  const { archivedChats, selectedChat, tab, calls } = useSelector(
    (state) => state.chat,
  );
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

  const getStatusForMessage = useCallback(
    (message) => {
      if (!selectedChat?.otherUserId) return null;
      return getMessageStatus(statuses, message.id, selectedChat.otherUserId);
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
    markAsRead: () => {
      if (selectedChat) {
        dispatch(markMessagesRead({ conversationId: selectedChat.id }));
      }
    },
    setLoadingOlder: (loading) => {
      if (selectedChat) {
        dispatch(
          setLoadingOlderMessages({ conversationId: selectedChat.id, loading }),
        );
      }
    },
    getStatusForMessage,
    clearCalls: () => dispatch(clearCalls()),
  };
};