const crypto = require("crypto");
const hashToken = require("../../shared/utils/hash");
const uploadFileToCloudinary = require("../../shared/utils/uploadToCloudinary");
const { buildMediaUrl } = require("../../shared/utils/mediaUrl");
const {
  createAccessTokenForUser,
  createRefreshTokenForUser,
} = require("../../shared/utils/jwtTokenUtil");
const DevicesRepo = require("../devices/devices.repo");
const SessionRepo = require("../sessions/sessions.repo");
const UserRepo = require("./users.repo");
const { baseCookieOptions } = require("../../shared/utils/cookieOptions");

function formatUserResponse(user) {
  if (!user) return null;

  return {
    ...user,
    avatar_url: user.avatar_storage_key
      ? buildMediaUrl(user.avatar_storage_key)
      : null,
  };
}

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

    const updatedUser = await UserRepo.completeProfileById(user.id, displayName);

    const accessToken = createAccessTokenForUser({
      id: user.id,
      phoneNumber,
    });
    const refreshToken = createRefreshTokenForUser({
      id: user.id,
      phoneNumber,
    });

    const refreshTokenHash = hashToken(refreshToken);

    let device = await DevicesRepo.findById(deviceId);

    if (!device) {
      device = await DevicesRepo.createDevice({
        id: deviceId,
        userId: user.id,
        deviceType: deviceType,
        identityPublicKey: "TEST_PUBLIC_KEY",
      });
    }

    await SessionRepo.revokeDeviceSessions(deviceId);

    await SessionRepo.createSession({
      id: crypto.randomUUID(),
      deviceId: deviceId,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    res.cookie("accessToken", accessToken, {
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      ...baseCookieOptions,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: "Onboarding complete",
      data: updatedUser,
    });
  } catch (error) {
    console.log("Error: ", error);
    res.status(500).json({
      message: "Failed to onboard new user",
    });
  }
};

const fetchMyProfile = async (req, res) => {
  try {
    const { phoneNumber } = req.user;

    const user = await UserRepo.findByPhoneWithAvatar(phoneNumber);

    return res.status(200).json({
      message: "Successfully fetched user profile",
      data: formatUserResponse(user),
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

    await UserRepo.updateUser(user.id, newDisplayName);
    const updatedUser = await UserRepo.findByIdWithAvatar(user.id);

    return res.status(200).json({
      message: "User details updated successfully",
      data: formatUserResponse(updatedUser),
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

    const { media, cloudinaryResponse } = await uploadFileToCloudinary({
      localFilePath,
      uploaderId: req.user.id,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });

    await UserRepo.setAvatarMediaId(req.user.id, media.id);
    const updatedUser = await UserRepo.findByIdWithAvatar(req.user.id);

    res.status(200).json({
      message: "File uploaded successfully",
      data: {
        avatarUrl: cloudinaryResponse.secure_url,
        avatarMediaId: media.id,
        user: formatUserResponse(updatedUser),
      },
    });
  } catch (error) {
    console.error("uploadAvatar error:", error);
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

  const user = await UserRepo.findByPhoneWithAvatar(phoneNumber);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const formattedUser = {
    id: user.id,
    name: user.display_name,
    phoneNumber: user.phone_number,
    profilePic: user.avatar_storage_key
      ? buildMediaUrl(user.avatar_storage_key)
      : null,
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
