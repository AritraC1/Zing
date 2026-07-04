import { createSlice } from "@reduxjs/toolkit";
import { verifyOtpThunk, refreshAccessTokenThunk } from "../api/authThunk";
import {
  getMyDetailsThunk,
  updateProfileThunk,
  uploadAvatarThunk,
} from "../../profile/api/profileThunk";
import { toUser } from "../../../shared/api/mappers/user";

const initialState = {
  isAuthenticated: false,
  isAuthChecking: true,
  user: null,
  accessToken: null,
  loginMode: "qr",
  phone: "",
  otp: "",
  showOtp: false,
  stayLoggedIn: true,
  loading: {
    verifyOtp: false,
    getMyDetails: false,
    updateProfile: false,
    uploadAvatar: false,
  },
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoginMode: (state, action) => {
      state.loginMode = action.payload;
    },
    setPhone: (state, action) => {
      state.phone = action.payload;
    },
    setOtp: (state, action) => {
      state.otp = action.payload;
    },
    setShowOtp: (state, action) => {
      state.showOtp = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.isAuthChecking = false;
      state.user = null;
      state.accessToken = null;
      state.error = null;
      state.phone = "";
      state.otp = "";
      state.showOtp = false;
      state.loginMode = "qr";
      state.stayLoggedIn = true;
      state.loading = {
        verifyOtp: false,
        getMyDetails: false,
        updateProfile: false,
        uploadAvatar: false,
      };
    },
  },

  extraReducers: (builder) => {
    builder
      // VERIFY OTP
      .addCase(verifyOtpThunk.pending, (state) => {
        state.loading.verifyOtp = true;
        state.error = null;
      })
      .addCase(verifyOtpThunk.fulfilled, (state, action) => {
        const payload = action.payload;
        state.loading.verifyOtp = false;
        state.isAuthenticated = true;
        state.isAuthChecking = false;
        state.user = {
          isNewUser: payload.isNewUser,
          profileCompleted: payload.profileCompleted,
        };
        state.accessToken = payload.accessToken || state.accessToken;
      })
      .addCase(verifyOtpThunk.rejected, (state, action) => {
        state.loading.verifyOtp = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload || "OTP verification failed";
      })

      // GET MY DETAILS
      .addCase(getMyDetailsThunk.pending, (state) => {
        state.loading.getMyDetails = true;
        state.isAuthChecking = true;
        state.error = null;
      })
      .addCase(getMyDetailsThunk.fulfilled, (state, action) => {
        state.loading.getMyDetails = false;
        state.isAuthChecking = false;
        state.isAuthenticated = true;
        state.user = action.payload.data;
      })
      .addCase(getMyDetailsThunk.rejected, (state, action) => {
        state.loading.getMyDetails = false;
        state.isAuthChecking = false;
        // Only fully logout if refresh also failed (interceptor will have retried)
        if (
          action.payload?.status === 403 ||
          action.payload === "Session expired"
        ) {
          state.isAuthenticated = false;
          state.user = null;
          state.accessToken = null;
        }
        state.error = action.payload || "Session expired";
      })

      // UPDATE PROFILE
      .addCase(updateProfileThunk.pending, (state) => {
        state.loading.updateProfile = true;
        state.error = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.loading.updateProfile = false;
        state.user = {
          ...state.user,
          ...toUser(action.payload.data),
        };
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.loading.updateProfile = false;
        state.error = action.payload;
      })

      // UPLOAD AVATAR
      .addCase(uploadAvatarThunk.pending, (state) => {
        state.loading.uploadAvatar = true;
        state.error = null;
      })
      .addCase(uploadAvatarThunk.fulfilled, (state, action) => {
        state.loading.uploadAvatar = false;
        if (state.user) {
          state.user.avatar = action.payload.data;
        }
      })
      .addCase(uploadAvatarThunk.rejected, (state, action) => {
        state.loading.uploadAvatar = false;
        state.error = action.payload;
      })

      // REFRESH ACCESS TOKEN
      .addCase(refreshAccessTokenThunk.fulfilled, (state, action) => {
        // Token refreshed successfully, maintain authentication state
        state.isAuthenticated = true;
        state.error = null;
        state.accessToken = action.payload?.accessToken || state.accessToken;
      })
      .addCase(refreshAccessTokenThunk.rejected, (state, action) => {
        // Refresh failed, logout user
        state.isAuthenticated = false;
        state.isAuthChecking = false;
        state.user = null;
        state.accessToken = null;
        state.error = action.payload || "Session expired";
      });
  },
});

export const { setLoginMode, setPhone, setOtp, setShowOtp, logout } =
  authSlice.actions;

export default authSlice.reducer;
