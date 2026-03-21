const uploadOnCloudinary = require("../../shared/utils/cloudinary");
const UserRepo = require("./users.repo");

const fetchMyProfile = async (req, res) => {
  try {
    const { phoneNumber } = req.user;

    const user = await UserRepo.findByPhone(phoneNumber);

    return res.status(200).json({
      message: "Successfully fetched user profile",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to get profile data",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { phoneNumber } = req.user;
    const { newDisplayName } = req.body;

    if (!phoneNumber || !newDisplayName) {
      return res.status(404).json({
        message: "Phone Number or New display name missing",
      });
    }

    const user = await UserRepo.findByPhone(phoneNumber);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const updatedUser = await UserRepo.updateUser(user.id, newDisplayName);

    return res.status(200).json({
      message: "User details updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({
      message: "Unable to update profile data",
    });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    const localFilePath = req.file?.path;

    if (!localFilePath) {
      return res.status(400).json({
        message: "File is required",
      });
    }

    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

    res.status(200).json({
      message: "File uploaded successfully",
      data: cloudinaryResponse,
    });
  } catch (error) {
    res.status(500).json({
      message: "Upload failed",
    });
  }
};

const fetchUsersByPhone = async (req, res) => {
  const { phoneNumber } = req.query;

  if (!phoneNumber) {
    return res.status(400).json({
      message: "Phone number is required",
    });
  }

  const user = await UserRepo.findByPhone(phoneNumber);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const formattedUser = {
    id: user.id,
    name: user.display_name,
    phoneNumber: user.phone_number,
    profilePic: null, // you can map avatar later
  };

  return res.status(200).json({
    message: "User found",
    user: formattedUser,
  });
};

module.exports = {
  fetchMyProfile,
  updateProfile,
  uploadAvatar,
  fetchUsersByPhone,
};
