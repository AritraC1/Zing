const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");

const router = express.Router();

// Auth routes
router.use("/auth", authRoutes);

module.exports = router;
