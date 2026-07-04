const MediaRepo = require("../media/media.repo");
const uploadFileToCloudinary = require("../../shared/utils/uploadToCloudinary");

const fileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { media, cloudinaryResponse } = await uploadFileToCloudinary({
      localFilePath: req.file.path,
      uploaderId: req.user.id,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        ...media,
        secure_url: cloudinaryResponse.secure_url,
      },
    });
  } catch (error) {
    console.error("fileUpload error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  fileUpload,
};
