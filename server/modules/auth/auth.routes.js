const express = require("express");

const {
  verifyOtp,
  refreshAccessToken,
  invalidateRefreshTokenAndLogout,
  uploadSignalProtocolKey,
  fetchUsersPublicKey,
  deleteAccount,
} = require("./auth.controllers");

const router = express.Router();

router.post("/verify-otp", verifyOtp);
router.post("/refresh", refreshAccessToken);
router.post("/logout", invalidateRefreshTokenAndLogout);
router.post("/keys/register", uploadSignalProtocolKey);
router.get("/keys/:userId", fetchUsersPublicKey);
router.delete("/delete-account", deleteAccount);

module.exports = router;
