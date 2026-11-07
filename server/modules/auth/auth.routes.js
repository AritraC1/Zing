const express = require("express");
const { authController } = require("./auth.controller");
const checkForJwt = require("./auth.middleware");
const authLimiter = require("../../core/rateLimit");

const router = express.Router();

router.post("/verify-otp", authLimiter, authController.verifyOtp);
router.post("/refresh", authLimiter, authController.refreshAccessToken);
router.post("/logout", authLimiter, authController.logout);
router.delete("/delete-account", checkForJwt(), authController.deleteAccount);

module.exports = router;
