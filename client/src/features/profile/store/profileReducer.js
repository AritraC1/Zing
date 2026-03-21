import { createSlice } from "@reduxjs/toolkit";
import {
  updateProfileThunk,
  uploadAvatarThunk,
  getMyDetails,
} from "../api/profileThunk";

const initialState = {
  user: null,
  loading: false,
  error: null,
  successMessage: null,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearUserState: (state) => {
      state.loading = false;
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder

      // Get My Details
      .addCase(getMyDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMyDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data;
      })
      .addCase(getMyDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Profile
      .addCase(updateProfileThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;

        // merge instead of overwrite (safer)
        state.user = {
          ...state.user,
          ...action.payload.data,
        };
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Upload Avatar
      .addCase(uploadAvatarThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(uploadAvatarThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;

        // assume response.data = avatar URL or object
        if (state.user) {
          state.user.avatar = action.payload.data;
        }
      })
      .addCase(uploadAvatarThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearUserState } = profileSlice.actions;
export default profileSlice.reducer;
