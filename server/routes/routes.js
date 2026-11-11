const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const usersRoutes = require("../modules/users/users.routes");
const chatRoutes = require("../modules/chat/chat.routes");
const mediaRoutes = require("../modules/media/media.routes");
const callsRoutes = require("../modules/calls/calls.routes");
const blocksRoutes = require("../modules/blocks/blocks.routes");
const notificationsRoutes = require("../modules/notifications/notifications.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/chats", chatRoutes);
router.use("/media", mediaRoutes);
router.use("/calls", callsRoutes);
router.use("/blocks", blocksRoutes);
router.use("/notifications", notificationsRoutes);

module.exports = router;
