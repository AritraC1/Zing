import { createAsyncThunk } from "@reduxjs/toolkit";
import ENDPOINTS from "../../../core/api/endpoints";
import axiosInstance from "../../../core/api/axiosInstance";

export const verifyOtpThunk = createAsyncThunk(
  "auth/verifyOtp",
  async ({ idToken, deviceId, deviceType }, thunkAPI) => {
    try {
      const res = await axiosInstance.post(ENDPOINTS.AUTH.VERIFY_OTP, {
        idToken,
        deviceId,
        deviceType,
      });
      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || error.message || "OTP verification failed",
      );
    }
  },
);

export const refreshAccessTokenThunk = createAsyncThunk(
  "auth/refreshAccessToken",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.post(ENDPOINTS.AUTH.REFRESH_TOKEN);
      console.log("Response of refresh token: ", res);
      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || error.message || "Refresh failed",
      );
    }
  },
);
