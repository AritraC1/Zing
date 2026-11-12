const express = require("express");
const { keysController } = require("./keys.controller");
const checkForJwt = require("../auth/auth.middleware");
const authLimiter = require("../../core/rateLimit");

const router = express.Router();

// All key endpoints require an authenticated session: the prekey
// directory is private — only participants of a chat can read each
// other's key material.
router.post("/register", authLimiter, checkForJwt(), keysController.registerKeys);
router.get(
  "/prekeys/count/:deviceId",
  checkForJwt(),
  keysController.getPreKeyCount,
);
router.get("/:userId", checkForJwt(), keysController.getPreKeyBundles);

module.exports = router;
