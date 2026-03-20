import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "../features/auth/store/authReducer";
import chatReducer from "../features/chat/store/chatReducer";
import storage from "redux-persist/lib/storage";
import { persistReducer } from "redux-persist";

// persist config ONLY for chat
const chatPersistConfig = {
  key: "chat",
  storage,
  whitelist: ["chats", "archivedChats"]
};

const rootReducer = combineReducers({
  auth: authReducer,
  chat: persistReducer(chatPersistConfig, chatReducer),
});

export default rootReducer;
