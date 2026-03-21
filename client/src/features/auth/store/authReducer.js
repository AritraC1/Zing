import { createSlice } from "@reduxjs/toolkit";
import { verifyOtpThunk } from "../api/authThunk";

const initialState = {
  isAuthenticated: false,
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
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
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
      .addCase(verifyOtpThunk.fulfilled, (state) => {
        state.loading.verifyOtp = false;
        state.isAuthenticated = true;
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
