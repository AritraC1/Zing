const crypto = require("crypto");
const redis = require("../../config/redis");
const UserRepo = require("../users/users.repo");
const SessionRepo = require("../sessions/sessions.repo");
const DevicesRepo = require("../devices/devices.repo");
const generateOtp = require("../../shared/utils/generateOTP");
const {
  createAccessTokenForUser,
  createRefreshTokenForUser,
  validateRefreshToken,
} = require("../../shared/utils/jwtTokenUtil");
const hashToken = require("../../shared/utils/hash");

// Request OTP
const requestOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: "phone number is required",
      });
    }

    const otp = generateOtp();
    const key = `otp:${phoneNumber}`;
    await redis.set(key, otp, "EX", 300);

    return res.status(200).json({
      message: `OTP Sent to ${phoneNumber}`,
      otp,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to send OTP",
    });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp, deviceId, deviceType } = req.body;

    if (!phoneNumber || !otp || !deviceId || !deviceType) {
      return res.status(400).json({
        error: "phone number, otp, deviceId, and deviceType are required",
      });
    }

    // Verify OTP
    const key = `otp:${phoneNumber}`;
    const storedOtp = await redis.get(key);

    if (!storedOtp) {
      return res.status(400).json({
        error: "OTP expired or not found",
      });
    }

    // storedOtp comes from redis as a string
    if (storedOtp !== otp) {
      return res.status(400).json({
        error: "Invalid OTP",
      });
    }

    await redis.del(key);

    // Check if user exists
    let user = await UserRepo.findByPhone(phoneNumber);

    // If user does not exist, create one
    if (!user) {
      user = await UserRepo.createUser(phoneNumber);
    }

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

    return res.status(200).json({
      message: "OTP verified",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      error: "OTP verification failed",
    });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: "phone number is required",
      });
    }

    const otp = generateOtp();
    const key = `otp:${phoneNumber}`;
    await redis.set(key, otp, "EX", 300);

    return res.status(200).json({
      message: `OTP Sent to ${phoneNumber}`,
      otp,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to resend OTP",
    });
  }
};

// Refresh access token
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh token required",
      });
    }

    // hash refresh token
    const refreshTokenHash = hashToken(refreshToken);

    // find session
    const session = await SessionRepo.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      return res.status(403).json({
        error: "Invalid session",
      });
    }

    // check expiration
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return res.status(403).json({
        error: "Session expired",
      });
    }

    // verify jwt
    const payload = validateRefreshToken(refreshToken);

    // generate new access token
    const newAccessToken = createAccessTokenForUser(payload.phoneNumber);

    // update last used
    await SessionRepo.updateLastUsed(session.id);

    return res.json({
      message: "New access token generated",
      accessToken: newAccessToken,
    });
  } catch (error) {
    return res.status(403).json({
      error: "Invalid refresh token",
    });
  }
};

// Logout
const invalidateRefreshTokenAndLogout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token required",
      });
    }

    // hash token
    const refreshTokenHash = hashToken(refreshToken);

    // find session
    const session = await SessionRepo.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // revoke session
    await SessionRepo.revokeSession(session.id);

    return res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Logout failed",
    });
  }
};

// Upload signal key - public
const uploadSignalProtocolKey = (req, res) => {};

// get user's public key
const fetchUsersPublicKey = (req, res) => {};

// Delete Account
const deleteAccount = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    await UserRepo.deleteUserByPhoneNumber(phoneNumber);

    return res.status(200).json({
      message: "user deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to delete account! Please try again after some times",
    });
  }
};

module.exports = {
  requestOtp,
  verifyOtp,
  resendOtp,
  refreshAccessToken,
  invalidateRefreshTokenAndLogout,
  uploadSignalProtocolKey,
  fetchUsersPublicKey,
  deleteAccount,
};
