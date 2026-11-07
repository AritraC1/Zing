const express = require("express");
const {
  fetchMyProfile,
  updateProfile,
  uploadAvatar,
  fetchUsersByPhone,
  onBoardNewUser,
} = require("./users.controller");
const checkForJwt = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/multer.middleware");
const validateBody = require("../../core/validation/validateBody");
const { onboardSchema } = require("../../core/validation/schemas");

const router = express.Router();

router.post("/onboard", checkForJwt(), validateBody(onboardSchema), onBoardNewUser);
router.get("/me", checkForJwt(), fetchMyProfile);
router.patch("/update-profile", checkForJwt(), updateProfile);
router.post("/upload-avatar", upload.single("avatar"), checkForJwt(), uploadAvatar);
router.get("/search", checkForJwt(), fetchUsersByPhone);

module.exports = router;
