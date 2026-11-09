import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../core/api/axiosInstance";
import ENDPOINTS from "../../../core/api/endpoints";
import { toConversation } from "../../../shared/api/mappers/conversation";
import { toCall } from "../../../shared/api/mappers/call";

// Fetch all my chats
export const fetchMyChats = createAsyncThunk(
  "chat/fetchMyChats",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.CHAT.MY_CHATS);
      const list = res.data.conversations ?? [];

      return { conversations: list.map(toConversation) };
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
        { params: { offset } },
      );
      return {
        conversationId,
        messages: res.data.messages,
        statuses: res.data.statuses,
        offset,
        hasMore: res.data.hasMore ?? res.data.messages?.length === 50,
      };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Send a message over HTTP (fallback when the socket is disconnected).
// Idempotent on clientMsgId — duplicates are never stored.
export const sendMessageRest = createAsyncThunk(
  "chat/sendMessageRest",
  async (
    { conversationId, clientMsgId, content, mediaId, msgType },
    thunkAPI,
  ) => {
    try {
      const res = await axiosInstance.post(
        ENDPOINTS.CHAT.SEND_MESSAGE.replace(
          ":conversationId",
          conversationId,
        ),
        { clientMsgId, content, mediaId, msgType },
      );
      return {
        conversationId,
        clientMsgId,
        message: res.data?.message,
      };
    } catch (err) {
      return thunkAPI.rejectWithValue({
        conversationId,
        clientMsgId,
        error: err.response?.data || err.message,
      });
    }
  },
);

// Upload media
export const uploadMedia = createAsyncThunk(
  "media/upload",
  async (file, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axiosInstance.post(ENDPOINTS.MEDIA.UPLOAD_MEDIA, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return res.data.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Fetch the persisted call history (answered / missed / rejected)
export const fetchCallHistory = createAsyncThunk(
  "chat/fetchCallHistory",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.CALLS.HISTORY);
      const list = res.data.calls ?? [];

      return list.map(toCall);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);
