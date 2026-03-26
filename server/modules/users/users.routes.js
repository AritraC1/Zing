const express = require("express");
const {
  fetchMyProfile,
  updateProfile,
  uploadAvatar,
  fetchUsersByPhone,
  onBoardNewUser,
} = require("./users.controllers");
const checkForJwt = require("../../middlewares/auth.middleware");
const upload  = require("../../middlewares/multer.middleware");

const router = express.Router();

router.post("/onboard", checkForJwt(), onBoardNewUser);
router.get("/me", checkForJwt(), fetchMyProfile);
router.patch("/update-profile", checkForJwt(), updateProfile);
router.post("/upload-avatar", upload.single("avatar"), checkForJwt(), uploadAvatar);
router.get("/search", checkForJwt(), fetchUsersByPhone);
// router.get("/:id/presence", checkForJwt, fetchMyStatus);

module.exports = router;
