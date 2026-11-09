const express = require("express");
const { callsController } = require("./calls.controller");
const checkForJwt = require("../auth/auth.middleware");

const router = express.Router();

router.get("/history", checkForJwt(), callsController.fetchCallHistory);

module.exports = router;
