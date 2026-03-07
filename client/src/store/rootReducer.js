import { combineReducers } from "@reduxjs/toolkit";
import authReducer from '../features/auth/store/authReducer'
import chatReducer from "../features/chat/store/chatReducer"

const rootReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
});

export default rootReducer;
