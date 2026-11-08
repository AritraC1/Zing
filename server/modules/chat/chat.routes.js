const express = require("express");
const { chatController } = require("./chat.controller");
const checkForJwt = require("../auth/auth.middleware");
const validateBody = require("../../core/validation/validateBody");
const { createConversationSchema } = require("../../core/validation/schemas");

const router = express.Router();

router.get(
  "/my-conversations",
  checkForJwt(),
  chatController.fetchAllMyConversations,
);
router.post(
  "/create-find-conversation",
  checkForJwt(),
  validateBody(createConversationSchema),
  chatController.createOrFindConversations,
);
router.get(
  "/conversation/:conversationId/messages",
  checkForJwt(),
  chatController.fetchMessages,
);

module.exports = router;
