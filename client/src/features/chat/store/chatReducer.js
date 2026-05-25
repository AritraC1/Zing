import { createSlice } from "@reduxjs/toolkit";
import { createOrFindChat, fetchMessages, fetchMyChats } from "../api/chatThunk";

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

      // If this is our own message, add initial 'sent' status for the recipient
      // if (message.sender_id === state.user?.id && state.selectedChat?.otherUserId) {
      //   if (!state.statuses[convId]) {
      //     state.statuses[convId] = [];
      //   }
      //   const existingStatus = state.statuses[convId].find(
      //     s => s.message_id === message.id && s.user_id === state.selectedChat.otherUserId
      //   );
      //   if (!existingStatus) {
      //     state.statuses[convId].push({
      //       message_id: message.id,
      //       user_id: state.selectedChat.otherUserId,
      //       msg_status: 'sent',
      //     });
      //   }
      // }

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
      const { conversationId, messages, statuses } = action.payload;
      
      if (!conversationId || !Array.isArray(messages)) {
        console.warn('Invalid setMessages payload:', action.payload);
        return;
      }
      
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      state.messages[conversationId] = messages.filter(m => m && m.id);

      if (statuses) {
        if (!state.statuses[conversationId]) {
          state.statuses[conversationId] = [];
        }
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

        // Handle both response formats
        let chatList = [];
        if (action.payload?.conversations && Array.isArray(action.payload.conversations)) {
          chatList = action.payload.conversations;
        } else if (Array.isArray(action.payload)) {
          chatList = action.payload;
        }
        
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
          // pagination (older messages on top)
          state.messages[conversationId] = [
            ...messages,
            ...state.messages[conversationId],
          ];
          // For statuses, we might need to merge, but for simplicity, replace for now
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
  setTab,
  selectChat,
  addChat,
  addMessage,
  updateMessageStatus,
  markMessagesRead,
  archiveChat,
  unarchiveChat,
  setMessages,
} = chatSlice.actions;

export default chatSlice.reducer;