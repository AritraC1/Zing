const express = require("express");

const {
  verifyOtp,
  refreshAccessToken,
  invalidateRefreshTokenAndLogout,
  deleteAccount,
} = require("./auth.controller");

const checkForJwt = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post("/verify-otp", verifyOtp);
router.post("/refresh", refreshAccessToken);
router.post("/logout", invalidateRefreshTokenAndLogout);
router.delete("/delete-account", deleteAccount);

module.exports = router;
