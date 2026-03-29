const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const usersRoutes = require("../modules/users/users.routes");
const chatRoutes = require("../modules/chat/chat.routes");

const router = express.Router();

// Auth routes
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/chats", chatRoutes);

module.exports = router;
