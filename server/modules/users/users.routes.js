const express = require("express");
const { usersController } = require("./users.controller");
const checkForJwt = require("../auth/auth.middleware");
const upload = require("../../core/media/multer.middleware");

const router = express.Router();

router.post("/onboard", checkForJwt(), usersController.onBoardNewUser);
router.get("/me", checkForJwt(), usersController.fetchMyProfile);
router.patch("/update-profile", checkForJwt(), usersController.updateProfile);
router.post(
  "/upload-avatar",
  upload.single("avatar"),
  checkForJwt(),
  usersController.uploadAvatar,
);
router.get("/search", checkForJwt(), usersController.fetchUsersByPhone);

module.exports = router;
