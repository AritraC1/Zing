const fs = require("fs");

const MediaRepo = require("../media/media.repo");
const uploadOnCloudinary = require("../../shared/utils/cloudinary");

const fileUpload = async (req, res) => {
  try {
    // Validate file exists
    if (!req.file) {
      console.log("3. No file - returning 400");
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Upload temp file to Cloudinary
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path);

    // Handle upload failure
    if (!cloudinaryResponse) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload file",
      });
    }

    // Delete local temp file after successful upload
    fs.unlinkSync(req.file.path);

    // Save media metadata in DB
    const media = await MediaRepo.insertMedia({
      uploader_id: req.user.id,
      storage_key: cloudinaryResponse.public_id,
      mime_type: req.file.mimetype,
      size_byte: req.file.size,
      checksum_sha256: null, // can implement later
    });

    // Return DB row + cloudinary URL
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

    // cleanup temp file if still exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  fileUpload,
};
