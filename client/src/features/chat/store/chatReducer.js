import { createSlice } from "@reduxjs/toolkit";
import {
  createOrFindChat,
  fetchMessages,
  fetchMyChats,
  fetchCallHistory,
  fetchStarredMessages,
} from "../api/chatThunk";
import { formatChatTime } from "../../../shared/utils/formatChatTime";
import { statusesArrayToMap, upsertStatus } from "./statusUtils";

function findMessageIndex(messages, { id, clientMsgId }) {
  return messages.findIndex(
    (m) =>
      (id && m.id === id) ||
      (clientMsgId && m.client_msg_id === clientMsgId),
  );
}

function mergePendingMessages(serverMessages, localMessages) {
  const pending = (localMessages || []).filter(
    (m) => m.sendStatus === "sending" || m.sendStatus === "failed",
  );
  const merged = [...serverMessages];
  pending.forEach((p) => {
    if (!merged.some((m) => m.client_msg_id === p.client_msg_id)) {
      merged.push(p);
    }
  });
  return merged;
}

// Chat list preview label: media-only messages would otherwise show
// an empty last-message row.
const previewText = (message) =>
  message?.content ||
  (message?.msg_type === "media" ? "📷 Photo" : "");

function bumpChatPreview(state, conversationId, lastMessage, lastMessageAt) {
  const chatIndex = state.chats.findIndex((c) => c.id === conversationId);
  if (chatIndex === -1) return;

  const chat = state.chats.splice(chatIndex, 1)[0];
  chat.lastMessage = lastMessage;
  chat.last_message = lastMessage;
  chat.message = lastMessage;
  chat.lastMessageAt = lastMessageAt;
  chat.last_message_at = lastMessageAt;
  chat.time = formatChatTime(lastMessageAt);
  state.chats.unshift(chat);
}

const initialState = {
  chats: [],
  archivedChats: [],
  selectedChat: null,
  tab: "chats",
  // Current user's id — captured from the auth store when chats are
  // fetched so group-chat unread logic can compare senders.
  myUserId: null,
  messages: {},
  statuses: {},
  messagePagination: {},
  calls: [],
  // conversationId -> { userId, isTyping } for the other participant.
  typing: {},
  // User IDs this user has blocked (delivery is enforced server-side).
  blockedUserIds: [],
  // Starred messages across all conversations (server-backed list,
  // loaded when the starred tab opens).
  starredMessages: [],
  // Jump-to-message: set when opening a chat from the starred list so
  // Messages scrolls to and flashes the target bubble.
  highlightMessage: null,
  presence: {
    online: {},
    lastSeenAt: {},
  },
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    resetChat: () => initialState,

    setTab: (state, action) => {
      state.tab = action.payload;
      state.selectedChat = null;
    },

    selectChat: (state, action) => {
      state.selectedChat = action.payload;
    },

    addChat: (state, action) => {
      const newChat = action.payload;
      const exists = state.chats.some((c) => c.id === newChat.id);
      if (!exists) {
        state.chats.unshift(newChat);
      }
    },

    addMessage: (state, action) => {
      const message = action.payload;
      if (!message?.conversation_id) return;

      const convId = message.conversation_id;
      const clientMsgId = message.client_msg_id;

      if (!state.messages[convId]) {
        state.messages[convId] = [];
      }

      const existingIndex = findMessageIndex(state.messages[convId], {
        id: message.id,
        clientMsgId,
      });

      if (existingIndex !== -1) {
        const existing = state.messages[convId][existingIndex];
        if (existing.sendStatus && message.id) {
          state.messages[convId][existingIndex] = {
            ...message,
            sendStatus: "sent",
          };
        }
        return;
      }

      if (!message.id && !clientMsgId) return;

      state.messages[convId].push(message);
      bumpChatPreview(state, convId, previewText(message), message.created_at);

      const chat = state.chats.find((c) => c.id === convId);
      if (chat) {
        // Direct: don't bump when the other party's message is our own
        // echo (sender_id is us, otherUserId is them). Group: the
        // mirror-image test — own messages never count as unread.
        const isOwnMessage = state.myUserId
          ? message.sender_id === state.myUserId
          : message.sender_id !== chat.otherUserId;
        if (!isOwnMessage) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }
      }
    },

    addOptimisticMessage: (state, action) => {
      const message = action.payload;
      if (!message?.conversation_id || !message?.client_msg_id) return;

      const convId = message.conversation_id;
      if (!state.messages[convId]) {
        state.messages[convId] = [];
      }

      const existingIndex = findMessageIndex(state.messages[convId], {
        clientMsgId: message.client_msg_id,
      });
      if (existingIndex !== -1) return;

      state.messages[convId].push({
        ...message,
        id: message.client_msg_id,
        sendStatus: "sending",
      });

      bumpChatPreview(state, convId, previewText(message), message.created_at);
    },

    reconcileMessage: (state, action) => {
      const { clientMsgId, serverMessage } = action.payload;
      if (!clientMsgId || !serverMessage?.id || !serverMessage.conversation_id) {
        return;
      }

      const convId = serverMessage.conversation_id;
      if (!state.messages[convId]) {
        state.messages[convId] = [];
      }

      const index = findMessageIndex(state.messages[convId], { clientMsgId });
      if (index !== -1) {
        state.messages[convId][index] = {
          ...serverMessage,
          sendStatus: "sent",
        };
      } else {
        const isDuplicate = state.messages[convId].some(
          (m) => m.id === serverMessage.id,
        );
        if (!isDuplicate) {
          state.messages[convId].push({ ...serverMessage, sendStatus: "sent" });
        }
      }

      bumpChatPreview(
        state,
        convId,
        previewText(serverMessage),
        serverMessage.created_at,
      );
    },

    markMessageFailed: (state, action) => {
      const { clientMsgId, conversationId } = action.payload;
      if (!clientMsgId || !conversationId) return;

      const messages = state.messages[conversationId];
      if (!messages) return;

      const index = findMessageIndex(messages, { clientMsgId });
      if (index !== -1) {
        messages[index].sendStatus = "failed";
      }
    },

    markMessageSending: (state, action) => {
      const { clientMsgId, conversationId } = action.payload;
      if (!clientMsgId || !conversationId) return;

      const messages = state.messages[conversationId];
      if (!messages) return;

      const index = findMessageIndex(messages, { clientMsgId });
      if (index !== -1) {
        messages[index].sendStatus = "sending";
      }
    },

    updateChatLastMessage: (state, action) => {
      const { conversationId, lastMessage, lastMessageAt } = action.payload;
      bumpChatPreview(state, conversationId, lastMessage, lastMessageAt);
    },

    updateMessageStatus: (state, action) => {
      const { messageId, userId, status, conversationId } = action.payload;
      if (!conversationId || !messageId || !userId) return;

      if (!state.statuses[conversationId]) {
        state.statuses[conversationId] = {};
      }

      upsertStatus(state.statuses[conversationId], messageId, userId, status);
    },

    markMessagesRead: (state, action) => {
      const { conversationId } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].map(
          (msg) => ({ ...msg, is_read: true }),
        );
      }

      const chat = state.chats.find((c) => c.id === conversationId);
      if (chat) {
        chat.unreadCount = 0;
      }
    },

    setMessages: (state, action) => {
      const {
        conversationId,
        messages,
        statuses,
        offset = 0,
        hasMore,
        isLocal,
      } = action.payload;

      if (!conversationId || !Array.isArray(messages)) {
        return;
      }

      const filtered = messages.filter((m) => m && m.id);

      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }

      if (offset === 0) {
        state.messages[conversationId] = mergePendingMessages(
          filtered,
          state.messages[conversationId],
        );
      } else {
        // Prepend only messages not already in the list — server pages
        // can overlap messages served earlier from the local cache.
        const existingIds = new Set(
          state.messages[conversationId].map((m) => m.id),
        );
        const fresh = filtered.filter((m) => !existingIds.has(m.id));
        state.messages[conversationId] = [
          ...fresh,
          ...state.messages[conversationId],
        ];
      }

      if (statuses) {
        state.statuses[conversationId] = statusesArrayToMap(statuses);
      }

      if (!state.messagePagination[conversationId]) {
        state.messagePagination[conversationId] = {
          hasMore: false,
          loadingOlder: false,
        };
      }

      if (hasMore !== undefined) {
        state.messagePagination[conversationId].hasMore = hasMore;
      }
      state.messagePagination[conversationId].loadingOlder = false;

      // serverCount tracks how many messages have been loaded from the
      // server (as opposed to the local IndexedDB cache) and is used as
      // the offset for the next older-page fetch. Local (IndexedDB)
      // pages don't change it. This mirrors the reducer-side math of
      // the fetch callers: offset + returned messages.
      if (!isLocal) {
        state.messagePagination[conversationId].serverCount =
          offset === 0
            ? filtered.length
            : (state.messagePagination[conversationId].serverCount || 0) +
              filtered.length;
      } else if (action.payload.serverCount !== undefined) {
        // Local hydration replaces the list wholesale — callers pass
        // serverCount explicitly (usually 0, until the fresh server
        // page-0 response re-anchors it).
        state.messagePagination[conversationId].serverCount =
          action.payload.serverCount;
      }
    },

    setLoadingOlderMessages: (state, action) => {
      const { conversationId, loading } = action.payload;
      if (!state.messagePagination[conversationId]) {
        state.messagePagination[conversationId] = {
          hasMore: false,
          loadingOlder: false,
        };
      }
      state.messagePagination[conversationId].loadingOlder = loading;
    },

    setPresence: (state, action) => {
      const { userId, online, lastSeenAt } = action.payload;
      if (!userId) return;

      if (online) {
        state.presence.online[userId] = true;
      } else {
        delete state.presence.online[userId];
        if (lastSeenAt) {
          state.presence.lastSeenAt[userId] = lastSeenAt;
        }
      }
    },

    // Restore a per-conversation status map straight from the local
    // (IndexedDB) cache — already in map form, no array conversion.
    setConversationStatuses: (state, action) => {
      const { conversationId, statuses } = action.payload;
      if (!conversationId || !statuses) return;
      state.statuses[conversationId] = statuses;
    },

    addCall: (state, action) => {
      state.calls.unshift(action.payload);
    },

    clearCalls: (state) => {
      state.calls = [];
    },
    archiveChat: (state, action) => {
      const chatId = action.payload;
      const chatIndex = state.chats.findIndex((c) => c.id === chatId);

      if (chatIndex !== -1) {
        const chat = state.chats.splice(chatIndex, 1)[0];
        const exists = state.archivedChats.some((c) => c.id === chatId);
        if (!exists) {
          state.archivedChats.push(chat);
        }
        if (state.selectedChat?.id === chatId) {
          state.selectedChat = null;
        }
      }
    },

    unarchiveChat: (state, action) => {
      const chatId = action.payload;
      const idx = state.archivedChats.findIndex((c) => c.id === chatId);

      if (idx !== -1) {
        const chat = state.archivedChats.splice(idx, 1)[0];
        const exists = state.chats.some((c) => c.id === chatId);
        if (!exists) {
          state.chats.unshift(chat);
        }
        if (state.tab === "archive") {
          state.tab = "chats";
          state.selectedChat = chat;
        }
      }
    },

    // Per-user mute flag (server-backed like archive). The chat may
    // live in either list; update wherever it is.
    setChatMuted: (state, action) => {
      const { conversationId, muted } = action.payload;
      if (!conversationId) return;

      const chat =
        state.chats.find((c) => c.id === conversationId) ||
        state.archivedChats.find((c) => c.id === conversationId);

      if (chat) {
        chat.isMuted = Boolean(muted);
        chat.is_muted = Boolean(muted);
      }
    },

    // Group rename (admin action): update the list and the open chat.
    renameChat: (state, action) => {
      const { conversationId, name } = action.payload;
      if (!conversationId || !name) return;

      const chat =
        state.chats.find((c) => c.id === conversationId) ||
        state.archivedChats.find((c) => c.id === conversationId);

      if (chat) {
        chat.name = name;
        chat.groupName = name;
      }
      if (state.selectedChat?.id === conversationId) {
        state.selectedChat = { ...state.selectedChat, name, groupName: name };
      }
    },

    // Membership change: a group this user left / was removed from /
    // that was deleted drops out of both lists.
    removeChat: (state, action) => {
      const conversationId = action.payload;
      state.chats = state.chats.filter((c) => c.id !== conversationId);
      state.archivedChats = state.archivedChats.filter(
        (c) => c.id !== conversationId,
      );
      if (state.selectedChat?.id === conversationId) {
        state.selectedChat = null;
      }
    },

    // "Delete chat for me": drop the chat from both lists and clear
    // this session's in-memory message cache for it (the persisted
    // IndexedDB history is wiped by the caller).
    deleteChat: (state, action) => {
      const conversationId = action.payload;
      if (!conversationId) return;

      state.chats = state.chats.filter((c) => c.id !== conversationId);
      state.archivedChats = state.archivedChats.filter(
        (c) => c.id !== conversationId,
      );
      delete state.messages[conversationId];
      delete state.statuses[conversationId];
      delete state.messagePagination[conversationId];
      if (state.selectedChat?.id === conversationId) {
        state.selectedChat = null;
      }
    },

    setTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!conversationId || !userId) return;

      if (isTyping) {
        state.typing[conversationId] = { userId, isTyping: true };
      } else if (state.typing[conversationId]?.userId === userId) {
        delete state.typing[conversationId];
      }
    },

    // Server-confirmed edit: update the bubble in place and refresh the
    // chat preview when the edited message is the latest one.
    applyMessageEdit: (state, action) => {
      const { conversationId, messageId, content, editedAt } = action.payload;
      if (!conversationId || !messageId) return;

      const messages = state.messages[conversationId];
      if (!messages) return;

      const index = messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;

      messages[index] = {
        ...messages[index],
        content,
        edited_at: editedAt || new Date().toISOString(),
      };

      if (index === messages.length - 1) {
        bumpChatPreview(
          state,
          conversationId,
          content,
          messages[index].created_at,
        );
      }
    },

    // Server-confirmed delete: collapse the bubble to a placeholder and
    // refresh the preview when the deleted message was the latest one.
    applyMessageDelete: (state, action) => {
      const { conversationId, messageId } = action.payload;
      if (!conversationId || !messageId) return;

      const messages = state.messages[conversationId];
      if (!messages) return;

      const index = messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;

      messages[index] = {
        ...messages[index],
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: null,
        secure_url: null,
      };

      if (index === messages.length - 1) {
        bumpChatPreview(
          state,
          conversationId,
          "🚫 This message was deleted",
          messages[index].created_at,
        );
      }
    },

    setBlockedUsers: (state, action) => {
      state.blockedUserIds = action.payload || [];
    },

    // Server-confirmed reaction update: replace the message's reaction
    // list wholesale (the server sends the complete, ordered list).
    applyReaction: (state, action) => {
      const { conversationId, messageId, reactions } = action.payload;
      if (!conversationId || !messageId) return;

      const messages = state.messages[conversationId];
      if (!messages) return;

      const index = messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;

      messages[index] = { ...messages[index], reactions: reactions || [] };
    },

    // Star state is per-user: flip the flag on the bubble and keep the
    // starred list (used by the starred tab) in step.
    applyStar: (state, action) => {
      const { conversationId, messageId, starred } = action.payload;
      if (!conversationId || !messageId) return;

      const messages = state.messages[conversationId];
      if (messages) {
        const index = messages.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          messages[index] = {
            ...messages[index],
            starred_by_me: Boolean(starred),
          };
        }
      }

      if (starred) {
        if (
          !state.starredMessages.some(
            (m) => m.id === messageId && m.conversation_id === conversationId,
          )
        ) {
          const source = messages?.find((m) => m.id === messageId);
          if (source) {
            state.starredMessages.unshift({
              ...source,
              conversation_id: conversationId,
              starred_at: new Date().toISOString(),
            });
          }
        }
      } else {
        state.starredMessages = state.starredMessages.filter(
          (m) => !(m.id === messageId && m.conversation_id === conversationId),
        );
      }
    },

    setStarredMessages: (state, action) => {
      state.starredMessages = action.payload || [];
    },

    // Scroll target for "jump to message" (starred list → chat bubble).
    setHighlightMessage: (state, action) => {
      state.highlightMessage = action.payload || null;
    },

    clearHighlightMessage: (state) => {
      state.highlightMessage = null;
    },

    addBlockedUser: (state, action) => {
      const userId = action.payload;
      if (userId && !state.blockedUserIds.includes(userId)) {
        state.blockedUserIds.push(userId);
      }
    },

    removeBlockedUser: (state, action) => {
      state.blockedUserIds = state.blockedUserIds.filter(
        (id) => id !== action.payload,
      );
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMyChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyChats.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.myUserId) {
          state.myUserId = action.payload.myUserId;
        }
        let chatList = [];
        if (
          action.payload?.conversations &&
          Array.isArray(action.payload.conversations)
        ) {
          chatList = action.payload.conversations;
        } else if (Array.isArray(action.payload)) {
          chatList = action.payload;
        }

        // The server's per-user is_archived flag is the source of truth
        // for archive state, so local-only archive state from previous
        // sessions is reconciled here on every refresh.
        const archived = [];
        chatList = chatList.filter((chat) => {
          if (chat.isArchived) {
            archived.push(chat);
            return false;
          }
          return true;
        });

        state.chats = chatList;
        state.archivedChats = archived;
        chatList.forEach((chat) => {
          if (chat.otherUserId && chat.otherUserLastSeenAt) {
            state.presence.lastSeenAt[chat.otherUserId] =
              chat.otherUserLastSeenAt;
          }
        });
      })
      .addCase(fetchMyChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createOrFindChat.fulfilled, () => {})
      .addCase(fetchStarredMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStarredMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.starredMessages = Array.isArray(action.payload)
          ? action.payload
          : [];
      })
      .addCase(fetchStarredMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCallHistory.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          state.calls = action.payload;
        }
      })
      .addCase(fetchMessages.pending, (state, action) => {
        const { offset = 0 } = action.meta.arg || {};
        if (offset > 0) {
          const { conversationId } = action.meta.arg;
          if (!state.messagePagination[conversationId]) {
            state.messagePagination[conversationId] = {
              hasMore: false,
              loadingOlder: false,
            };
          }
          state.messagePagination[conversationId].loadingOlder = true;
        } else {
          state.loading = true;
        }
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { conversationId, messages, statuses, offset, hasMore } =
          action.payload;

        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        if (!state.statuses[conversationId]) {
          state.statuses[conversationId] = {};
        }

        const filtered = (messages || []).filter((m) => m && m.id);

        if (offset === 0) {
          state.messages[conversationId] = mergePendingMessages(
            filtered,
            state.messages[conversationId],
          );
        } else {
          // Same overlap guard as setMessages: server pages can repeat
          // messages the local cache already provided.
          const existingIds = new Set(
            state.messages[conversationId].map((m) => m.id),
          );
          const fresh = filtered.filter((m) => !existingIds.has(m.id));
          state.messages[conversationId] = [
            ...fresh,
            ...state.messages[conversationId],
          ];
        }

        if (statuses) {
          state.statuses[conversationId] = statusesArrayToMap(statuses);
        }

        if (!state.messagePagination[conversationId]) {
          state.messagePagination[conversationId] = {
            hasMore: false,
            loadingOlder: false,
          };
        }
        state.messagePagination[conversationId].hasMore = hasMore ?? false;
        state.messagePagination[conversationId].loadingOlder = false;

        // Track how many messages came from the server (used as the
        // offset for the next older-page fetch; see setMessages).
        state.messagePagination[conversationId].serverCount =
          offset === 0
            ? filtered.length
            : (state.messagePagination[conversationId].serverCount || 0) +
              filtered.length;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        const { conversationId } = action.meta.arg || {};
        if (conversationId && state.messagePagination[conversationId]) {
          state.messagePagination[conversationId].loadingOlder = false;
        }
      });
  },
});

export const {
  resetChat,
  setTab,
  selectChat,
  addChat,
  addMessage,
  addOptimisticMessage,
  reconcileMessage,
  markMessageFailed,
  markMessageSending,
  updateMessageStatus,
  updateChatLastMessage,
  markMessagesRead,
  archiveChat,
  unarchiveChat,
  setChatMuted,
  renameChat,
  removeChat,
  deleteChat,
  setTyping,
  applyMessageEdit,
  applyMessageDelete,
  setBlockedUsers,
  addBlockedUser,
  removeBlockedUser,
  applyReaction,
  applyStar,
  setStarredMessages,
  setHighlightMessage,
  clearHighlightMessage,
  setMessages,
  setLoadingOlderMessages,
  setConversationStatuses,
  setPresence,
  addCall,
  clearCalls,
} = chatSlice.actions;

export default chatSlice.reducer;
