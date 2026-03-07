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
  selectedChat: null,
  tab: "chats",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setTab: (state, action) => {
      state.tab = action.payload;
    },
    selectChat: (state, action) => {
      state.selectedChat = action.payload;
    },
  },
});

export const { setTab, selectChat } = chatSlice.actions;

export default chatSlice.reducer;