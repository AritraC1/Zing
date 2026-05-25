const express = require("express");
const multer = require("multer");

const checkForJwt = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/multer.middleware");
const { fileUpload } = require("./media.controller");

const router = express.Router();

router.post("/upload", upload.single("file"), checkForJwt(), fileUpload);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File size exceeds 10MB limit",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  return next(err);
});

module.exports = router;
