import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../core/api/axiosInstance";
import ENDPOINTS from "../../../core/api/endpoints";

export const searchUserThunk = createAsyncThunk(
  "users/searchUser",
  async ({ phoneNumber }, thunkAPI) => {
    try {
      const cleanedNumber = "+" + phoneNumber.replace(/\D/g, "");

      const res = await axiosInstance.get(ENDPOINTS.USERS.SEARCH_USER, {
        params: { phoneNumber: cleanedNumber },
        // This encodes + as %2B instead of space
        paramsSerializer: (params) => {
          return new URLSearchParams(params).toString();
        },
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || "Something went wrong"
      );
    }
  },
);
