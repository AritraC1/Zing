const express = require("express");
const {
  fetchAllMyConversations,
  createOrFindConversations,
  fetchMessages,
} = require("./chat.controller");
const checkForJwt = require("../../middlewares/auth.middleware");
const validateBody = require("../../shared/middlewares/validateBody");
const { createConversationSchema } = require("../../shared/validation/schemas");

const router = express.Router();

router.get("/my-conversations", checkForJwt(), fetchAllMyConversations);
router.post(
  "/create-find-conversation",
  checkForJwt(),
  validateBody(createConversationSchema),
  createOrFindConversations,
);
router.get("/conversation/:conversationId/messages", checkForJwt(), fetchMessages);

module.exports = router;
