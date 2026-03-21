import { createSlice } from "@reduxjs/toolkit";
import { searchUserThunk } from "../api/usersThunk";

const initialState = {
  user: null,
  loading: false,
  error: null,
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUser: (state) => {
      state.user = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchUserThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchUserThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(searchUserThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong";
      });
  },
});

export const { clearUser } = usersSlice.actions;
export default usersSlice.reducer;
