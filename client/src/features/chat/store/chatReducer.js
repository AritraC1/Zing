import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  chats: [],
  archivedChats: [],
  selectedChat: null,
  tab: "chats",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setTab: (state, action) => {
      state.tab = action.payload;
      // reset selected chat when switching tabs so conversation pane hides
      state.selectedChat = null;
    },

    selectChat: (state, action) => {
      state.selectedChat = action.payload;
    },

    addChat: (state, action) => {
      const newChat = action.payload;

      const exists = state.chats.some((c) => c.id === newChat.id);
      if (!exists) {
        state.chats.push(newChat);
      }
    },

    // Archive chat
    archiveChat: (state, action) => {
      const chatId = action.payload;

      const chatIndex = state.chats.findIndex((c) => c.id === chatId);

      if (chatIndex !== -1) {
        const chat = state.chats.splice(chatIndex, 1)[0];

        // prevent duplicates
        const exists = state.archivedChats.some((c) => c.id === chatId);
        if (!exists) {
          state.archivedChats.push(chat);
        }

        // if the chat being archived is currently selected, clear selection
        if (state.selectedChat?.id === chatId) {
          state.selectedChat = null;
        }
      }
    },

    // Unarchive chat
    unarchiveChat: (state, action) => {
      const chatId = action.payload;

      const idx = state.archivedChats.findIndex((c) => c.id === chatId);
      if (idx !== -1) {
        const chat = state.archivedChats.splice(idx, 1)[0];

        // prevent duplicates
        const exists = state.chats.some((c) => c.id === chatId);
        if (!exists) {
          state.chats.push(chat);
        }

        // if we were viewing the archive tab, switch back to chats and select the chat
        if (state.tab === "archive") {
          state.tab = "chats";
          state.selectedChat = chat;
        }
      }
    },
  },
});

export const { setTab, selectChat, addChat, archiveChat, unarchiveChat } =
  chatSlice.actions;

export default chatSlice.reducer;
