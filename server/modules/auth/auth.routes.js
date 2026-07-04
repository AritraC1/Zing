const express = require("express");

const {
  verifyOtp,
  refreshAccessToken,
  invalidateRefreshTokenAndLogout,
  deleteAccount,
} = require("./auth.controller");

const checkForJwt = require("../../middlewares/auth.middleware");
const authLimiter = require("../../middlewares/rateLimit");

const router = express.Router();

router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/refresh", authLimiter, refreshAccessToken);
router.post("/logout", authLimiter, invalidateRefreshTokenAndLogout);
router.delete("/delete-account", checkForJwt(), deleteAccount);

module.exports = router;
