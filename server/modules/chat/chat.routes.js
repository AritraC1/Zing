const express = require("express");
const { chatController } = require("./chat.controller");
const checkForJwt = require("../auth/auth.middleware");
const validateBody = require("../../core/validation/validateBody");
const {
  createConversationSchema,
  sendMessageSchema,
  editMessageSchema,
  archiveSchema,
  muteSchema,
  reactionSchema,
  starSchema,
} = require("../../core/validation/schemas");

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
  "/starred-messages",
  checkForJwt(),
  chatController.fetchStarredMessages,
);
router.get(
  "/conversation/:conversationId/messages",
  checkForJwt(),
  chatController.fetchMessages,
);
router.post(
  "/conversation/:conversationId/messages",
  checkForJwt(),
  validateBody(sendMessageSchema),
  chatController.sendMessage,
);
router.patch(
  "/conversation/:conversationId/messages/:messageId",
  checkForJwt(),
  validateBody(editMessageSchema),
  chatController.editMessage,
);
router.delete(
  "/conversation/:conversationId/messages/:messageId",
  checkForJwt(),
  chatController.deleteMessage,
);
router.put(
  "/conversation/:conversationId/messages/:messageId/reaction",
  checkForJwt(),
  validateBody(reactionSchema),
  chatController.setReaction,
);
router.delete(
  "/conversation/:conversationId/messages/:messageId/reaction",
  checkForJwt(),
  validateBody(reactionSchema),
  chatController.setReaction,
);
router.post(
  "/conversation/:conversationId/messages/:messageId/star",
  checkForJwt(),
  validateBody(starSchema),
  chatController.setStarred,
);
router.post(
  "/conversation/:conversationId/archive",
  checkForJwt(),
  validateBody(archiveSchema),
  chatController.setArchive,
);
router.post(
  "/conversation/:conversationId/mute",
  checkForJwt(),
  validateBody(muteSchema),
  chatController.setMute,
);

module.exports = router;
