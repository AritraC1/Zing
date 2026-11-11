const express = require("express");
const { blocksController } = require("./blocks.controller");
const checkForJwt = require("../auth/auth.middleware");
const validateBody = require("../../core/validation/validateBody");
const { blockUserSchema } = require("../../core/validation/schemas");

const router = express.Router();

router.post("/block", checkForJwt(), validateBody(blockUserSchema), blocksController.block);
router.post("/unblock", checkForJwt(), validateBody(blockUserSchema), blocksController.unblock);
router.get("/blocked", checkForJwt(), blocksController.listBlocked);

module.exports = router;
