const express = require("express");
const checkForJwt = require("../auth/auth.middleware");
const validateBody = require("../../core/validation/validateBody");
const { notificationsController } = require("./notifications.controller");
const { registerTokenSchema } = require("../../core/validation/schemas");

const router = express.Router();

router.post(
  "/register",
  checkForJwt(),
  validateBody(registerTokenSchema),
  notificationsController.registerToken,
);

module.exports = router;
