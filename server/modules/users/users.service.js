const crypto = require("crypto");
const UserRepository = require("./users.repository");
const SessionRepository = require("../sessions/sessions.repository");
const DeviceRepository = require("../device/device.repository");
const uploadFileToCloudinary = require("../../utils/uploadToCloudinary");
const { buildMediaUrl } = require("../../utils/mediaUrl");
const {
  createAccessTokenForUser,
  createRefreshTokenForUser,
} = require("../../utils/jwtTokenUtil");
const hashToken = require("../../utils/hash");
const { REFRESH_TOKEN_MAX_AGE } = require("../../utils/issueCookies");
const AppError = require("../../core/errors/AppError");
const { withTransaction } = require("../../utils/withTransaction");

// Shape a user row (with avatar) for API responses
const formatUserResponse = (user) => {
  if (!user) return null;

  return {
    ...user,
    avatar_url: user.avatar_storage_key
      ? buildMediaUrl(user.avatar_storage_key)
      : null,
  };
};

class UserService {
  constructor() {
    this.userRepo = new UserRepository();
    this.deviceRepo = new DeviceRepository();
  }

  // Complete onboarding: set display name, register the device,
  // revoke old sessions, and issue a new refresh token
  async onboardUser({ phoneNumber, displayName, deviceId, deviceType }) {
    const user = await this.userRepo.findByPhone(phoneNumber);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const profile = await withTransaction(async (client) => {
      const updatedProfile =
        await this.userRepo.completeProfileByIdWithClient(
          user.id,
          displayName,
          client,
        );

      let device = await this.deviceRepo.findById(deviceId);

      if (!device) {
        device = await this.deviceRepo.createDevice(
          {
            id: deviceId,
            userId: user.id,
            deviceType,
            identityPublicKey: "TEST_PUBLIC_KEY",
          },
          client,
        );
      }

      // One active session per device
      await SessionRepository.revokeDeviceSessions(deviceId, client);

      const refreshToken = createRefreshTokenForUser({
        id: user.id,
        phoneNumber,
      });

      await SessionRepository.createSession(
        {
          id: crypto.randomUUID(),
          deviceId,
          refreshTokenHash: hashToken(refreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
        },
        client,
      );

      return updatedProfile;
    });

    const accessToken = createAccessTokenForUser({
      id: user.id,
      phoneNumber,
    });

    return { profile, accessToken, refreshToken };
  }

  // Fetch the authenticated user's profile
  async fetchMyProfile(phoneNumber) {
    const user = await this.userRepo.findByPhoneWithAvatar(phoneNumber);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return formatUserResponse(user);
  }

  // Update the authenticated user's display name
  async updateProfile({ phoneNumber, newDisplayName }) {
    if (!phoneNumber || !newDisplayName) {
      throw new AppError("Phone number or new display name missing", 400);
    }

    const user = await this.userRepo.findByPhone(phoneNumber);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    await this.userRepo.updateUser(user.id, newDisplayName);
    const updatedUser = await this.userRepo.findByIdWithAvatar(user.id);

    return formatUserResponse(updatedUser);
  }

  // Upload an avatar and attach it to the user
  async uploadAvatar({ userId, localFilePath, mimeType, sizeBytes }) {
    const { media, cloudinaryResponse } = await uploadFileToCloudinary({
      localFilePath,
      uploaderId: userId,
      mimeType,
      sizeBytes,
    });

    await this.userRepo.setAvatarMediaId(userId, media.id);
    const updatedUser = await this.userRepo.findByIdWithAvatar(userId);

    return {
      avatarUrl: cloudinaryResponse.secure_url,
      avatarMediaId: media.id,
      user: formatUserResponse(updatedUser),
    };
  }

  // Look up a public user profile by phone number
  async fetchUserByPhone(phoneNumber) {
    if (!phoneNumber) {
      throw new AppError("Phone number is required", 400);
    }

    const user = await this.userRepo.findByPhoneWithAvatar(phoneNumber);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return {
      id: user.id,
      name: user.display_name,
      phoneNumber: user.phone_number,
      profilePic: user.avatar_storage_key
        ? buildMediaUrl(user.avatar_storage_key)
        : null,
    };
  }
}

module.exports = UserService;
