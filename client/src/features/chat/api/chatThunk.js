import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../core/api/axiosInstance";
import ENDPOINTS from "../../../core/api/endpoints";
import { toConversation } from "../../../shared/api/mappers/conversation";
import { toCall } from "../../../shared/api/mappers/call";
import {
  decryptMessages,
  previewForContent,
} from "../utils/e2ee";

// Fetch all my chats
export const fetchMyChats = createAsyncThunk(
  "chat/fetchMyChats",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.CHAT.MY_CHATS);
      const list = res.data.conversations ?? [];

      // Include the caller's own id so the reducer can compute
      // group-chat unread counts correctly (sender vs me).
      const myUserId = thunkAPI.getState()?.auth?.user?.id ?? null;

      return {
        myUserId,
        conversations: list.map((raw) => {
          const conversation = toConversation(raw);
          // Last message previews for 1:1 chats are E2EE envelopes on
          // the wire — show a locked placeholder instead of ciphertext.
          return {
            ...conversation,
            lastMessage: previewForContent(conversation.lastMessage),
            message: previewForContent(conversation.message),
          };
        }),
      };
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

      // 1:1 chat messages arrive as E2EE envelopes; decrypt them (and
      // show the locked placeholder for anything undecryptable) before
      // they hit Redux or the local IndexedDB store.
      const decryptedMessages = await decryptMessages(res.data.messages);

      return {
        conversationId,
        messages: decryptedMessages,
        statuses: res.data.statuses,
        offset,
        hasMore:
          res.data.hasMore ?? decryptedMessages?.length === 50,
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
    { conversationId, clientMsgId, content, mediaId, msgType, forwardedFromId, replyToId },
    thunkAPI,
  ) => {
    try {
      const res = await axiosInstance.post(
        ENDPOINTS.CHAT.SEND_MESSAGE.replace(
          ":conversationId",
          conversationId,
        ),
        { clientMsgId, content, mediaId, msgType, forwardedFromId, replyToId },
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

// Edit a text message over HTTP (socket fallback). Server authorizes
// the sender and returns the updated timestamps.
export const editMessageRest = createAsyncThunk(
  "chat/editMessageRest",
  async ({ conversationId, messageId, content }, thunkAPI) => {
    try {
      const res = await axiosInstance.patch(
        ENDPOINTS.CHAT.EDIT_MESSAGE.replace(
          ":conversationId",
          conversationId,
        ).replace(":messageId", messageId),
        { content },
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Soft-delete a message over HTTP (socket fallback).
export const deleteMessageRest = createAsyncThunk(
  "chat/deleteMessageRest",
  async ({ conversationId, messageId }, thunkAPI) => {
    try {
      const res = await axiosInstance.delete(
        ENDPOINTS.CHAT.DELETE_MESSAGE.replace(
          ":conversationId",
          conversationId,
        ).replace(":messageId", messageId),
      );
      return { conversationId, messageId, ...res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Persist this user's archive flag for a conversation so it syncs
// across devices and survives re-logins.
export const archiveChatApi = createAsyncThunk(
  "chat/archiveChatApi",
  async ({ conversationId, archived }, thunkAPI) => {
    try {
      const res = await axiosInstance.post(
        ENDPOINTS.CHAT.ARCHIVE.replace(":conversationId", conversationId),
        { archived },
      );
      return { conversationId, archived: res.data?.archived ?? archived };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Persist this user's per-conversation mute flag (push suppression is
// enforced server-side).
export const setMuteApi = createAsyncThunk(
  "chat/setMuteApi",
  async ({ conversationId, muted }, thunkAPI) => {
    try {
      const res = await axiosInstance.post(
        ENDPOINTS.CHAT.MUTE.replace(":conversationId", conversationId),
        { muted },
      );
      return { conversationId, muted: res.data?.muted ?? muted };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Set or remove an emoji reaction over HTTP (socket fallback). The
// server returns the message's full reaction list.
export const setReactionRest = createAsyncThunk(
  "chat/setReactionRest",
  async ({ conversationId, messageId, emoji, action }, thunkAPI) => {
    try {
      const res = await axiosInstance({
        method: action === "add" ? "put" : "delete",
        url: ENDPOINTS.CHAT.REACTION.replace(
          ":conversationId",
          conversationId,
        ).replace(":messageId", messageId),
        data: { emoji, action },
      });
      return {
        conversationId,
        messageId,
        reactions: res.data?.reactions ?? [],
      };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Star / unstar a message over HTTP (socket fallback). Per-user state.
export const setStarredRest = createAsyncThunk(
  "chat/setStarredRest",
  async ({ conversationId, messageId, starred }, thunkAPI) => {
    try {
      const res = await axiosInstance.post(
        ENDPOINTS.CHAT.STAR.replace(":conversationId", conversationId).replace(
          ":messageId",
          messageId,
        ),
        { starred },
      );
      return {
        conversationId,
        messageId,
        starred: res.data?.starred ?? starred,
      };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// The user's starred messages across all conversations.
export const fetchStarredMessages = createAsyncThunk(
  "chat/fetchStarredMessages",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.CHAT.STARRED);
      return res.data?.starredMessages ?? [];
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Blocking — the server enforces delivery; the client mirrors the list.
export const fetchBlockedUsers = createAsyncThunk(
  "chat/fetchBlockedUsers",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.BLOCKS.LIST);
      return res.data.blockedUserIds ?? [];
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

export const blockUserApi = createAsyncThunk(
  "chat/blockUserApi",
  async (userId, thunkAPI) => {
    try {
      await axiosInstance.post(ENDPOINTS.BLOCKS.BLOCK, { userId });
      return userId;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);

export const unblockUserApi = createAsyncThunk(
  "chat/unblockUserApi",
  async (userId, thunkAPI) => {
    try {
      await axiosInstance.post(ENDPOINTS.BLOCKS.UNBLOCK, { userId });
      return userId;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
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
      const [directRes, groupRes] = await Promise.allSettled([
        axiosInstance.get(ENDPOINTS.CALLS.HISTORY),
        axiosInstance.get(ENDPOINTS.CALLS.GROUP_HISTORY),
      ]);

      const list = [
        ...(directRes.status === "fulfilled" ? directRes.value.data.calls ?? [] : []),
        ...(groupRes.status === "fulfilled" ? groupRes.value.data.calls ?? [] : []),
      ];

      // Newest first across both call kinds.
      list.sort(
        (a, b) =>
          new Date(b.startedAt ?? b.started_at ?? 0) -
          new Date(a.startedAt ?? a.started_at ?? 0),
      );

      return list.map(toCall);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  },
);
