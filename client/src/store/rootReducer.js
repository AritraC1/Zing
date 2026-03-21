import { combineReducers } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistReducer } from "redux-persist";

import authReducer from "../features/auth/store/authReducer";
import chatReducer from "../features/chat/store/chatReducer";
import userReducer from "../features/users/store/usersReducer";
import profileReducer from "../features/profile/store/profileReducer";

// persist config ONLY for chat
const chatPersistConfig = {
  key: "chat",
  storage,
  whitelist: ["chats", "archivedChats"]
};

const rootReducer = combineReducers({
  auth: authReducer,
  chat: persistReducer(chatPersistConfig, chatReducer),
  users: userReducer,
  profile: profileReducer,
});

export default rootReducer;
