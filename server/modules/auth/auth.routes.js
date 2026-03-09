const express = require("express");
const { requestOtp, verifyOtp } = require("./auth.controllers");
const limiter = require("../../middlewares/rateLimit");

const router = express.Router();

router.post("/request-otp", limiter, requestOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
