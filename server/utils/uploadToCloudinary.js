const fs = require("fs");
const uploadOnCloudinary = require("./cloudinary");
const MediaRepo = require("../../modules/media/media.repo");

async function uploadFileToCloudinary({
  localFilePath,
  uploaderId,
  mimeType,
  sizeBytes,
}) {
  const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

  if (!cloudinaryResponse) {
    throw new Error("Cloudinary upload failed");
  }

  if (localFilePath && fs.existsSync(localFilePath)) {
    fs.unlinkSync(localFilePath);
  }

  const media = await MediaRepo.insertMedia({
    uploader_id: uploaderId,
    storage_key: cloudinaryResponse.public_id,
    mime_type: mimeType,
    size_byte: sizeBytes,
    checksum_sha256: null,
  });

  return { media, cloudinaryResponse };
}

module.exports = uploadFileToCloudinary;
