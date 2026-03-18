const express = require("express");
const {
  fetchMyProfile,
  updateProfile,
  uploadAvatar,
  fetchUsersByPhone,
} = require("./users.controllers");
const checkForJwt = require("../../middlewares/auth.middleware");
const upload  = require("../../middlewares/multer.middleware");

const router = express.Router();

router.get("/me", checkForJwt, fetchMyProfile);
router.patch("/update-profile", checkForJwt, updateProfile);
router.post("/upload-avatar", upload.single("avatar"), uploadAvatar);
router.get("/search", checkForJwt, fetchUsersByPhone);
// router.get("/:id/presence", checkForJwt, fetchMyStatus);

module.exports = router;
