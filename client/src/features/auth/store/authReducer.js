import { createSlice } from "@reduxjs/toolkit";
import { verifyOtpThunk } from "../api/authThunk";

const initialState = {
  isAuthenticated: false,
  token: null,
  refreshToken: null,
  user: null,

  loginMode: "qr",

  phone: "",
  otp: "",
  showOtp: false,

  stayLoggedIn: true,

  loading: {
    verifyOtp: false,
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
    logout: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      return initialState;
    },
  },

  extraReducers: (builder) => {
    builder
      // PENDING
      .addCase(verifyOtpThunk.pending, (state) => {
        state.loading.verifyOtp = true;
        state.error = null;
      })

      // SUCCESS
      .addCase(verifyOtpThunk.fulfilled, (state, action) => {
        state.loading.verifyOtp = false;

        // 🛑 GUARD CLAUSE
        if (!action.payload || !action.payload.accessToken) {
          state.error = "Invalid server response";
          return;
        }

        state.isAuthenticated = true;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;

        localStorage.setItem("token", action.payload.accessToken);
        localStorage.setItem("refreshToken", action.payload.refreshToken);
      })

      // FAILURE
      .addCase(verifyOtpThunk.rejected, (state, action) => {
        state.loading.verifyOtp = false;
        state.error = action.payload || "OTP verification failed";
      });
  },
});

export const { setLoginMode, setPhone, setOtp, setShowOtp, logout } =
  authSlice.actions;

export default authSlice.reducer;
