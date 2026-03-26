import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../core/api/axiosInstance";
import ENDPOINTS from "../../../core/api/endpoints";

// Complete user onboard
export const completeUserOnboardThunk = createAsyncThunk(
  "user/completeOnboard",
  async ({ displayName, deviceId, deviceType }, thunkAPI) => {
    try {
      const res = await axiosInstance.post(ENDPOINTS.USERS.ONBOARD_USER, {
        displayName,
        deviceId,
        deviceType,
      });
      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "unable to complete profile",
      );
    }
  },
);

// Get My details
export const getMyDetailsThunk = createAsyncThunk(
  "me/myDetails",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.ME.CHECK_ME);

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch profile",
      );
    }
  },
);

// Update Profile Thunk
export const updateProfileThunk = createAsyncThunk(
  "user/updateProfile",
  async ({ newDisplayName }, thunkAPI) => {
    try {
      const res = await axiosInstance.patch(ENDPOINTS.ME.UPDATE_PROFILE, {
        newDisplayName,
      });
      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || error.message || "Update Failed",
      );
    }
  },
);

// Upload Avatar Thunk
export const uploadAvatarThunk = createAsyncThunk(
  "user/uploadAvatar",
  async ({ file }, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await axiosInstance.post(
        ENDPOINTS.ME.UPLOAD_PROFILE_PIC,
        formData,
      );
      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || error.message || "Upload failed",
      );
    }
  },
);
