import { createSlice } from "@reduxjs/toolkit";
import {
  createOrFindChat,
  fetchMessages,
  fetchMyChats,
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
  messages: {},
  statuses: {},
  messagePagination: {},
  calls: [],
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
      bumpChatPreview(state, convId, message.content, message.created_at);

      const chat = state.chats.find((c) => c.id === convId);
      if (chat && message.sender_id !== chat.otherUserId) {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
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

      bumpChatPreview(state, convId, message.content, message.created_at);
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
        serverMessage.content,
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
        state.messages[conversationId] = [
          ...filtered,
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
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMyChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyChats.fulfilled, (state, action) => {
        state.loading = false;
        let chatList = [];
        if (
          action.payload?.conversations &&
          Array.isArray(action.payload.conversations)
        ) {
          chatList = action.payload.conversations;
        } else if (Array.isArray(action.payload)) {
          chatList = action.payload;
        }
        state.chats = chatList;
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
          state.messages[conversationId] = [
            ...filtered,
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
  setMessages,
  setLoadingOlderMessages,
  setPresence,
  addCall,
  clearCalls,
} = chatSlice.actions;

export default chatSlice.reducer;
