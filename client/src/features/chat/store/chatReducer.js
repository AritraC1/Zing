import { createSlice } from "@reduxjs/toolkit";
import { createOrFindChat, fetchMessages, fetchMyChats } from "../api/chatThunk";

const initialState = {
  chats: [],
  archivedChats: [],
  selectedChat: null,
  tab: "chats",
  messages: {},
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
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
        state.chats.unshift(newChat); // latest on top
      }
    },

    // SOCKET: new message
    addMessage: (state, action) => {
      const message = action.payload;
      if (!message || !message.id || !message.conversation_id) {
        console.warn('Invalid message received:', message);
        return;
      }
      
      const convId = message.conversation_id;

      if (!state.messages[convId]) {
        state.messages[convId] = [];
      }

      // Avoid duplicate messages
      const isDuplicate = state.messages[convId].some(m => m.id === message.id);
      if (!isDuplicate) {
        state.messages[convId].push(message);
      }

      // move chat to top
      const chatIndex = state.chats.findIndex((c) => c.id === convId);
      if (chatIndex !== -1) {
        const chat = state.chats.splice(chatIndex, 1)[0];
        state.chats.unshift(chat);
      }
    },

    // SOCKET: read receipt
    markMessagesRead: (state, action) => {
      const { conversationId } = action.payload;

      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[
          conversationId
        ].map((msg) => ({
          ...msg,
          is_read: true,
        }));
      }
    },

    // SOCKET: set messages for a conversation (from message_history event)
    setMessages: (state, action) => {
      const { conversationId, messages } = action.payload;
      
      if (!conversationId || !Array.isArray(messages)) {
        console.warn('Invalid setMessages payload:', action.payload);
        return;
      }
      
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      state.messages[conversationId] = messages.filter(m => m && m.id);
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

        // Handle both response formats
        let chatList = [];
        if (action.payload?.conversations && Array.isArray(action.payload.conversations)) {
          chatList = action.payload.conversations;
        } else if (Array.isArray(action.payload)) {
          chatList = action.payload;
        }
        
        console.log('Chats loaded:', chatList);
        state.chats = chatList;
      })
      .addCase(fetchMyChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('Failed to fetch chats:', action.payload);
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

        const { conversationId, messages, offset } = action.payload;

        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }

        if (offset === 0) {
          state.messages[conversationId] = messages;
        } else {
          // pagination (older messages on top)
          state.messages[conversationId] = [
            ...messages,
            ...state.messages[conversationId],
          ];
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setTab,
  selectChat,
  addChat,
  addMessage,
  markMessagesRead,
  archiveChat,
  unarchiveChat,
  setMessages,
} = chatSlice.actions;

export default chatSlice.reducer;