const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");
const ENV = require("../../config/env");

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Uplaod the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // File has been uploaded successfully
    console.log(
      "File has been uploaded successfully on cloudinary: ",
      response,
    );

    return response;
  } catch (error) {
    // remove the locally saved temp file as the upload operation fails
    fs.unlinkSync(localFilePath);

    return null;
  }
};

module.exports = uploadOnCloudinary;
