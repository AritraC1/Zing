import { createSlice } from "@reduxjs/toolkit";
import {
  updateProfileThunk,
  uploadAvatarThunk,
  completeUserOnboardThunk,
} from "../api/profileThunk";

const initialState = {
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
      // Complete Onboard
      .addCase(completeUserOnboardThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeUserOnboardThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(completeUserOnboardThunk.rejected, (state, action) => {
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
      })
      .addCase(uploadAvatarThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearUserState } = profileSlice.actions;
export default profileSlice.reducer;