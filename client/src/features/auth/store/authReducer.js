import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  token: null,
  user: null,

  loginMode: "qr",

  phone: "",
  otp: "",
  showOtp: false,
  otpTimer: 30,

  stayLoggedIn: true,

  loading: {
    sendOtp: false,
    verifyOtp: false
  },

  error: null
}

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
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.token = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
    }
  }
});

export const {
  setLoginMode,
  setPhone,
  setOtp,
  setShowOtp,
  loginSuccess,
  logout
} = authSlice.actions;

export default authSlice.reducer;
