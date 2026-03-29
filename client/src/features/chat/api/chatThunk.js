import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../core/api/axiosInstance";
import ENDPOINTS from "../../../core/api/endpoints";

// Fetch all my chats
export const fetchMyChats = createAsyncThunk(
  "chat/fetchMyChats",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.CHAT.MY_CHATS);

      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Create or find conversation
export const createOrFindChat = createAsyncThunk(
  "chat/createOrFindChat",
  async (userId, thunkAPI) => {
    try {
      const res = await axiosInstance.post(ENDPOINTS.CHAT.CREATE_FIND_CHAT, {
        userId,
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Fetch messages (pagination)
export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ conversationId, offset = 0 }, thunkAPI) => {
    try {
      const res = await axiosInstance.get(
        ENDPOINTS.CHAT.GET_MESSAGES.replace(":conversationId", conversationId),
      );
      return {
        conversationId,
        messages: res.data.messages,
        offset,
      };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);
