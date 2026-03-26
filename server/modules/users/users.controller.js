const crypto = require("crypto");
const uploadOnCloudinary = require("../../shared/utils/cloudinary");
const hashToken = require("../../shared/utils/hash");
const {
  createAccessTokenForUser,
  createRefreshTokenForUser,
} = require("../../shared/utils/jwtTokenUtil");
const DevicesRepo = require("../devices/devices.repo");
const SessionRepo = require("../sessions/sessions.repo");
const UserRepo = require("./users.repo");

const onBoardNewUser = async (req, res) => {
  try {
    const { phoneNumber } = req.user;
    const { displayName, deviceId, deviceType } = req.body;

    if (!displayName || !deviceId || !deviceType) {
      return res.status(400).json({
        message: "displayName, deviceId and deviceType are required",
      });
    }

    const user = await UserRepo.findByPhone(phoneNumber);

    // complete profile
    await UserRepo.completeProfileById(user.id, displayName);

    // Create and register sessions and devices for new user

    // Generate Token for the user
    const accessToken = createAccessTokenForUser(phoneNumber);
    const refreshToken = createRefreshTokenForUser(phoneNumber);

    // hash refresh token
    const refreshTokenHash = hashToken(refreshToken);

    // Check if device exists
    let device = await DevicesRepo.findById(deviceId);

    if (!device) {
      device = await DevicesRepo.createDevice({
        id: deviceId,
        userId: user.id,
        deviceType: deviceType,
        identityPublicKey: "TEST_PUBLIC_KEY",
      });
    }

    // revoke previous session for this device
    await SessionRepo.revokeDeviceSessions(deviceId);

    // Create new session entry
    await SessionRepo.createSession({
      id: crypto.randomUUID(),
      deviceId: deviceId,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    // Cookies

    // Access Token Cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 15 * 60 * 1000, // 15 min
    });

    // Refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    });

    return res.json({
      message: "Onboarding complete",
    });
  } catch (error) {
    console.log("Error: ", error);
    res.status(500).json({
      message: "Failed to onboard new user",
    });
  }
};

// get my profile
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

// Update display name
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

// update profile picture
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

// Get all users by phone number
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
  onBoardNewUser,
  fetchMyProfile,
  updateProfile,
  uploadAvatar,
  fetchUsersByPhone,
};
