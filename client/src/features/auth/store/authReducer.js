import { createSlice } from "@reduxjs/toolkit";
import { verifyOtpThunk, refreshAccessTokenThunk } from "../api/authThunk";
import {
  getMyDetailsThunk,
  updateProfileThunk,
  uploadAvatarThunk,
} from "../../profile/api/profileThunk";

const initialState = {
  isAuthenticated: false,
  isAuthChecking: false,
  user: null,
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
        const data = action.payload.data;
        state.loading.getMyDetails = false;
        state.isAuthChecking = false;
        state.isAuthenticated = true;
        state.user = {
          ...data,
          profileCompleted: data.profile_completed, // ← map snake_case
        };
      })
      .addCase(getMyDetailsThunk.rejected, (state, action) => {
        state.loading.getMyDetails = false;
        state.isAuthChecking = false;
        state.isAuthenticated = false;
        state.user = null;
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
          ...action.payload.data,
          profileCompleted:
            action.payload.data?.profile_completed ?? // ← map snake_case
            state.user?.profileCompleted,
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
      .addCase(refreshAccessTokenThunk.fulfilled, (state) => {
        // Token refreshed successfully, maintain authentication state
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(refreshAccessTokenThunk.rejected, (state, action) => {
        // Refresh failed, logout user
        state.isAuthenticated = false;
        state.isAuthChecking = false;
        state.user = null;
        state.error = action.payload || "Session expired";
      });
  },
});

export const { setLoginMode, setPhone, setOtp, setShowOtp, logout } =
  authSlice.actions;

export default authSlice.reducer;
