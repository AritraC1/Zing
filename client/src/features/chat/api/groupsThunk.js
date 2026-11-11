import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../core/api/axiosInstance";
import ENDPOINTS from "../../../core/api/endpoints";

// Groups (group chats, max 10 members). All membership mutations are
// admin-gated server-side; the client optimistically mirrors the list.

// POST /api/groups — { name, memberIds }
export const createGroup = createAsyncThunk(
  "groups/create",
  async ({ name, memberIds }, thunkAPI) => {
    try {
      const res = await axiosInstance.post(ENDPOINTS.GROUPS.CREATE, {
        name,
        memberIds,
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || err.response?.data || err.message,
      );
    }
  },
);

// GET /api/groups/:conversationId — roster + metadata
export const fetchGroupInfo = createAsyncThunk(
  "groups/info",
  async (conversationId, thunkAPI) => {
    try {
      const res = await axiosInstance.get(
        ENDPOINTS.GROUPS.INFO.replace(":conversationId", conversationId),
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || err.response?.data || err.message,
      );
    }
  },
);

// PATCH /api/groups/:conversationId/name — admin only
export const renameGroup = createAsyncThunk(
  "groups/rename",
  async ({ conversationId, name }, thunkAPI) => {
    try {
      const res = await axiosInstance.patch(
        ENDPOINTS.GROUPS.RENAME.replace(":conversationId", conversationId),
        { name },
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || err.response?.data || err.message,
      );
    }
  },
);

// POST /api/groups/:conversationId/members — admin only
export const addGroupMembers = createAsyncThunk(
  "groups/addMembers",
  async ({ conversationId, memberIds }, thunkAPI) => {
    try {
      const res = await axiosInstance.post(
        ENDPOINTS.GROUPS.ADD_MEMBERS.replace(
          ":conversationId",
          conversationId,
        ),
        { memberIds },
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || err.response?.data || err.message,
      );
    }
  },
);

// DELETE /api/groups/:conversationId/members/:userId — admin only
export const removeGroupMember = createAsyncThunk(
  "groups/removeMember",
  async ({ conversationId, userId }, thunkAPI) => {
    try {
      const res = await axiosInstance.delete(
        ENDPOINTS.GROUPS.REMOVE_MEMBER.replace(
          ":conversationId",
          conversationId,
        ).replace(":userId", userId),
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || err.response?.data || err.message,
      );
    }
  },
);

// POST /api/groups/:conversationId/leave — any member
export const leaveGroup = createAsyncThunk(
  "groups/leave",
  async (conversationId, thunkAPI) => {
    try {
      const res = await axiosInstance.post(
        ENDPOINTS.GROUPS.LEAVE.replace(":conversationId", conversationId),
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || err.response?.data || err.message,
      );
    }
  },
);
