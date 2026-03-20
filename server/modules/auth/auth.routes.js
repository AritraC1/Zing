const express = require("express");
const limiter = require("../../middlewares/rateLimit");
const {
  // requestOtp,
  verifyOtp,
  // resendOtp,
  refreshAccessToken,
  invalidateRefreshTokenAndLogout,
  uploadSignalProtocolKey,
  fetchUsersPublicKey,
  deleteAccount,
} = require("./auth.controllers");

const router = express.Router();

// router.post("/request-otp", limiter, requestOtp);
router.post("/verify-otp", verifyOtp);
// router.post("/resend-otp", limiter, resendOtp);
router.post("/refresh", refreshAccessToken);
router.post("/logout", invalidateRefreshTokenAndLogout);
router.post("/keys/register", uploadSignalProtocolKey);
router.get("/keys/:userId", fetchUsersPublicKey);
router.delete("/delete-account", deleteAccount);

module.exports = router;
