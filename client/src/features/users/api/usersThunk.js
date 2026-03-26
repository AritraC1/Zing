import { parsePhoneNumber, isValidPhoneNumber } from "react-phone-number-input";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../core/api/axiosInstance";
import ENDPOINTS from "../../../core/api/endpoints";

export const searchUserThunk = createAsyncThunk(
  "users/searchUser",
  async ({ phoneNumber, defaultCountry = "IN" }, thunkAPI) => {
    try {
      let normalized;

      if (phoneNumber.startsWith("+")) {
        if (!isValidPhoneNumber(phoneNumber)) {
          return thunkAPI.rejectWithValue("Invalid phone number");
        }
        normalized = parsePhoneNumber(phoneNumber).number;
      } else {
        if (!isValidPhoneNumber(phoneNumber, defaultCountry)) {
          return thunkAPI.rejectWithValue("Invalid phone number");
        }
        normalized = parsePhoneNumber(phoneNumber, defaultCountry).number;
      }

      const res = await axiosInstance.get(ENDPOINTS.USERS.SEARCH_USER, {
        params: { phoneNumber: normalized },
        paramsSerializer: (params) => new URLSearchParams(params).toString(),
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Something went wrong",
      );
    }
  },
);
