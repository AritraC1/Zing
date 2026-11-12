// client/src/features/chat/hooks/useChat.js
import { useCallback } from "react";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import {
  selectChat,
  setTab,
  archiveChat,
  unarchiveChat,
  setChatMuted,
  markMessagesRead,
  clearCalls,
  setLoadingOlderMessages,
  addBlockedUser,
  removeBlockedUser,
  deleteChat,
} from "../store/chatReducer";
import {
  selectSortedChats,
  selectMessagesForChat,
  selectStatusesForChat,
  selectMessagePagination,
  selectPresenceForUser,
  selectTypingForChat,
  selectIsUserBlocked,
} from "../store/chatSelectors";
import { getMessageStatus } from "../store/statusUtils";
import * as messageDb from "../local/messageDb";
import {
  archiveChatApi,
  setMuteApi,
  blockUserApi,
  unblockUserApi,
  deleteChatApi,
  fetchMyChats,
} from "../api/chatThunk";

export const useChat = () => {
  const dispatch = useDispatch();
  const {
    archivedChats,
    selectedChat,
    tab,
    calls,
    blockedUserIds,
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
  const otherUserTyping = useSelector((state) =>
    selectTypingForChat(state, conversationId),
  );
  const isChatBlocked = useSelector((state) =>
    selectIsUserBlocked(state, selectedChat?.otherUserId),
  );

  const getStatusForMessage = useCallback(
    (message) => {
      if (!selectedChat?.otherUserId) return null;
      return getMessageStatus(statuses, message.id, selectedChat.otherUserId);
    },
    [statuses, selectedChat],
  );

  // Archive is persisted per-user server-side (is_archived on the
  // participant row) so it survives re-login and syncs across devices.
  // Local state moves immediately; the API call reconciles failures.
  const archiveChatWithApi = useCallback(
    (id) => {
      dispatch(archiveChat(id));
      dispatch(archiveChatApi({ conversationId: id, archived: true }))
        .unwrap()
        .catch(() => {
          toast.error("Could not archive chat. Try again.");
        });
    },
    [dispatch],
  );

  const unarchiveChatWithApi = useCallback(
    (id) => {
      dispatch(unarchiveChat(id));
      dispatch(archiveChatApi({ conversationId: id, archived: false }))
        .unwrap()
        .catch(() => {
          toast.error("Could not unarchive chat. Try again.");
        });
    },
    [dispatch],
  );

  // Mute is persisted per-user server-side (push suppression is
  // enforced there); local state moves first, API reconciles failures.
  const setChatMutedWithApi = useCallback(
    (id, muted) => {
      dispatch(setChatMuted({ conversationId: id, muted }));
      dispatch(setMuteApi({ conversationId: id, muted }))
        .unwrap()
        .catch(() => {
          dispatch(setChatMuted({ conversationId: id, muted: !muted }));
          toast.error("Could not update notification settings. Try again.");
        });
    },
    [dispatch],
  );

  // Optimistic block/unblock with rollback if the server rejects it.
  const blockUserWithApi = useCallback(
    (userId) => {
      dispatch(addBlockedUser(userId));
      dispatch(blockUserApi(userId))
        .unwrap()
        .catch(() => {
          dispatch(removeBlockedUser(userId));
          toast.error("Could not block contact. Try again.");
        });
    },
    [dispatch],
  );

  const unblockUserWithApi = useCallback(
    (userId) => {
      dispatch(removeBlockedUser(userId));
      dispatch(unblockUserApi(userId))
        .unwrap()
        .catch(() => {
          dispatch(addBlockedUser(userId));
          toast.error("Could not unblock contact. Try again.");
        });
    },
    [dispatch],
  );

  // "Delete chat for me": optimistic — the chat vanishes from both
  // lists immediately, the local (IndexedDB) history is wiped, then
  // the server marks the participant row deleted. If the server call
  // fails, refetch the chats to restore the pre-delete state.
  const deleteChatWithApi = useCallback(
    (id) => {
      if (!id) return;
      dispatch(deleteChat(id));
      messageDb.deleteConversation(id);
      dispatch(deleteChatApi(id))
        .unwrap()
        .catch(() => {
          toast.error("Could not delete chat. Try again.");
          dispatch(fetchMyChats());
        });
    },
    [dispatch],
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
    otherUserTyping,
    isChatBlocked,
    blockedUserIds,
    calls,

    setTab: (t) => dispatch(setTab(t)),
    selectChat: (chat) => dispatch(selectChat(chat)),
    archiveChat: archiveChatWithApi,
    unarchiveChat: unarchiveChatWithApi,
    setMuted: setChatMutedWithApi,
    blockUser: blockUserWithApi,
    unblockUser: unblockUserWithApi,
    deleteChat: deleteChatWithApi,
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
