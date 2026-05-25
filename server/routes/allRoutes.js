const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const usersRoutes = require("../modules/users/users.routes");
const chatRoutes = require("../modules/chat/chat.routes");
const mediaRoutes = require("../modules/media/media.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/chats", chatRoutes);
router.use("/media", mediaRoutes);

module.exports = router;
