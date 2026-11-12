const express = require("express");
const { groupsController } = require("./groups.controller");
const checkForJwt = require("../auth/auth.middleware");
const validateBody = require("../../core/validation/validateBody");
const {
  createGroupSchema,
  renameGroupSchema,
  addGroupMembersSchema,
} = require("../../core/validation/schemas");
const AppError = require("../../core/errors/AppError");
const { validate: uuidValidate } = require("uuid");

const router = express.Router();

function assertConversationIdParam(req, _res, next) {
  if (!uuidValidate(req.params.conversationId)) {
    return next(new AppError("Invalid conversation id", 400));
  }
  next();
}

router.post("/", checkForJwt(), validateBody(createGroupSchema), groupsController.createGroup);

router.get(
  "/:conversationId",
  checkForJwt(),
  assertConversationIdParam,
  groupsController.getGroupInfo,
);

router.patch(
  "/:conversationId/name",
  checkForJwt(),
  assertConversationIdParam,
  validateBody(renameGroupSchema),
  groupsController.renameGroup,
);

router.post(
  "/:conversationId/members",
  checkForJwt(),
  assertConversationIdParam,
  validateBody(addGroupMembersSchema),
  groupsController.addMembers,
);

router.delete(
  "/:conversationId/members/:userId",
  checkForJwt(),
  assertConversationIdParam,
  groupsController.removeMember,
);

router.post(
  "/:conversationId/leave",
  checkForJwt(),
  assertConversationIdParam,
  groupsController.leaveGroup,
);

module.exports = router;
