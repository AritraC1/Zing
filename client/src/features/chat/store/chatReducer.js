import { createSlice } from "@reduxjs/toolkit";
import {
  createOrFindChat,
  fetchMessages,
  fetchMyChats,
} from "../api/chatThunk";

const initialState = {
  chats: [],
  archivedChats: [],
  selectedChat: null,
  tab: "chats",
  messages: {},
  statuses: {},
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

    // SOCKET: new message
    addMessage: (state, action) => {
      const message = action.payload;
      if (!message || !message.id || !message.conversation_id) {
        console.warn("Invalid message received:", message);
        return;
      }

      const convId = message.conversation_id;

      if (!state.messages[convId]) {
        state.messages[convId] = [];
      }

      const isDuplicate = state.messages[convId].some(
        (m) => m.id === message.id,
      );
      if (!isDuplicate) {
        state.messages[convId].push(message);
      }

      // Move chat to top and update last message preview
      const chatIndex = state.chats.findIndex((c) => c.id === convId);
      if (chatIndex !== -1) {
        const chat = state.chats.splice(chatIndex, 1)[0];
        chat.last_message = message.content;
        chat.last_message_at = message.created_at;
        state.chats.unshift(chat);
      }
    },

    // SOCKET: update last message on chat list item (without a full message object)
    updateChatLastMessage: (state, action) => {
      const { conversationId, lastMessage, lastMessageAt } = action.payload;
      const chatIndex = state.chats.findIndex((c) => c.id === conversationId);
      if (chatIndex !== -1) {
        const chat = state.chats.splice(chatIndex, 1)[0];
        chat.last_message = lastMessage;
        chat.last_message_at = lastMessageAt;
        state.chats.unshift(chat);
      }
    },

    // SOCKET: update message delivery/seen status
    updateMessageStatus: (state, action) => {
      const { messageId, userId, status } = action.payload;

      for (const convId of Object.keys(state.statuses)) {
        const statusEntry = state.statuses[convId].find(
          (s) => s.message_id === messageId && s.user_id === userId,
        );
        if (statusEntry) {
          statusEntry.msg_status = status;
          break;
        }
      }
    },

    // SOCKET: read receipt
    markMessagesRead: (state, action) => {
      const { conversationId } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].map(
          (msg) => ({ ...msg, is_read: true }),
        );
      }
    },

    // SOCKET: set messages for a conversation (from message_history event)
    setMessages: (state, action) => {
      const { conversationId, messages, statuses } = action.payload;

      if (!conversationId || !Array.isArray(messages)) {
        console.warn("Invalid setMessages payload:", action.payload);
        return;
      }

      state.messages[conversationId] = messages.filter((m) => m && m.id);

      if (statuses) {
        state.statuses[conversationId] = statuses;
      }
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

      // FETCH CONVERSATIONS
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
      })
      .addCase(fetchMyChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error("Failed to fetch chats:", action.payload);
      })

      // CREATE / FIND CHAT
      .addCase(createOrFindChat.fulfilled, () => {
        // do nothing
      })

      // FETCH MESSAGES
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { conversationId, messages, statuses, offset } = action.payload;

        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        if (!state.statuses[conversationId]) {
          state.statuses[conversationId] = [];
        }

        if (offset === 0) {
          state.messages[conversationId] = messages;
          state.statuses[conversationId] = statuses;
        } else {
          state.messages[conversationId] = [
            ...messages,
            ...state.messages[conversationId],
          ];
          state.statuses[conversationId] = statuses;
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  resetChat,
  setTab,
  selectChat,
  addChat,
  addMessage,
  updateMessageStatus,
  updateChatLastMessage,
  markMessagesRead,
  archiveChat,
  unarchiveChat,
  setMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
