import { combineReducers } from "@reduxjs/toolkit";
import chatReducer from "../features/chat/store/chatReducer"

const rootReducer = combineReducers({
  chat: chatReducer,
});

export default rootReducer;
