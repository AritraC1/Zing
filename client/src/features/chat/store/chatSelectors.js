import { createSelector } from "@reduxjs/toolkit";
import { getMessageStatus } from "./statusUtils";

const selectChatState = (state) => state.chat;

export const selectSelectedChat = createSelector(
  selectChatState,
  (chat) => chat.selectedChat,
);

export const selectSortedChats = createSelector(
  selectChatState,
  (chat) =>
    [...chat.chats].sort((a, b) => {
      const aTime = new Date(a.lastMessageAt || a.last_message_at || 0).getTime();
      const bTime = new Date(b.lastMessageAt || b.last_message_at || 0).getTime();
      return bTime - aTime;
    }),
);

export const selectMessagesForChat = createSelector(
  [selectChatState, (_, conversationId) => conversationId],
  (chat, conversationId) =>
    conversationId ? chat.messages[conversationId] || [] : [],
);

export const selectStatusesForChat = createSelector(
  [selectChatState, (_, conversationId) => conversationId],
  (chat, conversationId) =>
    conversationId ? chat.statuses[conversationId] || {} : {},
);

export const selectMessagePagination = createSelector(
  [selectChatState, (_, conversationId) => conversationId],
  (chat, conversationId) =>
    conversationId
      ? chat.messagePagination[conversationId] || { hasMore: false, loadingOlder: false }
      : { hasMore: false, loadingOlder: false },
);

export const selectPresenceForUser = createSelector(
  [selectChatState, (_, userId) => userId],
  (chat, userId) => {
    if (!userId) return { online: false, lastSeenAt: null };
    return {
      online: Boolean(chat.presence.online[userId]),
      lastSeenAt: chat.presence.lastSeenAt[userId] ?? null,
    };
  },
);

// Who is currently typing in a conversation. Only meaningful for the
// other participant in 1:1 chats.
export const selectTypingForChat = createSelector(
  [selectChatState, (_, conversationId) => conversationId],
  (chat, conversationId) =>
    conversationId ? chat.typing[conversationId] || null : null,
);

export const selectIsUserBlocked = createSelector(
  [selectChatState, (_, userId) => userId],
  (chat, userId) => (userId ? chat.blockedUserIds.includes(userId) : false),
);

export const makeSelectMessageStatus = (conversationId, messageId, userId) =>
  createSelector(
    [(state) => state.chat.statuses[conversationId]],
    (convStatuses) => getMessageStatus(convStatuses, messageId, userId),
  );
