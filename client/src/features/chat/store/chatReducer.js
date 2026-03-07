import { createSlice } from "@reduxjs/toolkit";

const chats = [
  {
    id: 1,
    name: "Arjun Kapoor",
    message: "Sure, the meeting's at 4pm!",
    time: "4:32 PM",
  },
  {
    id: 2,
    name: "Priya Rao",
    message: "Can you review this PR?",
    time: "2:14 PM",
  },
  {
    id: 3,
    name: "Siddharth M.",
    message: "Deploy went smooth 🚀",
    time: "11:58 AM",
  },
  {
    id: 4,
    name: "Rahul Gupta",
    message: "Thanks for the update!",
    time: "Yesterday",
  },
];

const initialState = {
  chats,
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

    // Archive chat
    archiveChat: (state, action) => {
      const chatId = action.payload;

      const chatIndex = state.chats.findIndex((c) => c.id === chatId);

      if (chatIndex !== -1) {
        const chat = state.chats.splice(chatIndex, 1)[0];
        state.archivedChats.push(chat);

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
        state.chats.push(chat);

        // if we were viewing the archive tab, switch back to chats and select the chat
        if (state.tab === "archive") {
          state.tab = "chats";
          state.selectedChat = chat;
        }
      }
    },
  },
});

export const { setTab, selectChat, archiveChat, unarchiveChat } = chatSlice.actions;

export default chatSlice.reducer;
