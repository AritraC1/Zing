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

    // 🔥 SOCKET: new message
    addMessage: (state, action) => {
      const message = action.payload;
      const convId = message.conversation_id;

      if (!state.messages[convId]) {
        state.messages[convId] = [];
      }

      state.messages[convId].push(message);

      // move chat to top
      const chatIndex = state.chats.findIndex((c) => c.id === convId);
      if (chatIndex !== -1) {
        const chat = state.chats.splice(chatIndex, 1)[0];
        state.chats.unshift(chat);
      }
    },

    // 🔥 SOCKET: read receipt
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
      })
      .addCase(fetchMyChats.fulfilled, (state, action) => {
        state.loading = false;

        // replace chats (you can merge if needed)
        state.chats = action.payload;
      })
      .addCase(fetchMyChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // CREATE / FIND CHAT
      .addCase(createOrFindChat.fulfilled, (state, action) => {
        const { conversationId } = action.payload;

        const exists = state.chats.some((c) => c.id === conversationId);

        if (!exists) {
          state.chats.unshift({ id: conversationId });
        }
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
} = chatSlice.actions;

export default chatSlice.reducer;