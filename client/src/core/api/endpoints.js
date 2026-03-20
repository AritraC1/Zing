import ENV from "../config/env";

const baseUrl = ENV.baseUrl.replace(/\/+$/, "");

const ENDPOINTS = {
  AUTH: {
    VERIFY_OTP: `${baseUrl}/auth/verify-otp`,
    REGISTER: `${baseUrl}/auth/register`,
  },
};

export default ENDPOINTS;
