const UserRepo = require("../users/users.repo");
const SessionRepo = require("../sessions/sessions.repo");
const DevicesRepo = require("../devices/devices.repo");
const {
  createAccessTokenForUser,
  createRefreshTokenForUser,
  validateRefreshToken,
} = require("../../shared/utils/jwtTokenUtil");
const hashToken = require("../../shared/utils/hash");
const admin = require("../../config/firebase");
const { baseCookieOptions } = require("../../shared/utils/cookieOptions");
const asyncHandler = require("../../shared/utils/asyncHandler");
const crypto = require("crypto");

const verifyOtp = async (req, res) => {
  try {
    const { idToken, deviceId, deviceType } = req.body;

    let phoneNumber;

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      phoneNumber = decodedToken.phone_number;

      if (!phoneNumber) {
        return res
          .status(400)
          .json({ error: "Phone number not found in token" });
      }
    } catch (authError) {
      console.error("Firebase Token Verification Failed:", authError);
      return res
        .status(401)
        .json({ error: "Invalid or expired Firebase token" });
    }

    let user = await UserRepo.findByPhone(phoneNumber);

    const isNewUser = !user;

    if (isNewUser) {
      user = await UserRepo.createUser(phoneNumber);

      const onboardingToken = createAccessTokenForUser({
        id: user.id,
        phoneNumber,
      });

      res.cookie("accessToken", onboardingToken, {
        ...baseCookieOptions,
        maxAge: 10 * 60 * 1000,
      });

      return res.status(200).json({
        message: "OTP verified",
        isNewUser: true,
        profileCompleted: false,
        accessToken: onboardingToken,
      });
    }

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
        deviceType,
        identityPublicKey: "TEST_PUBLIC_KEY",
      });
    }

    await SessionRepo.revokeDeviceSessions(deviceId);

    await SessionRepo.createSession({
      id: crypto.randomUUID(),
      deviceId,
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

    return res.status(200).json({
      message: "OTP verified",
      isNewUser: false,
      profileCompleted: user.profile_completed,
      accessToken,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      error: "OTP verification failed",
    });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh token required",
      });
    }

    const payload = validateRefreshToken(refreshToken);

    const refreshTokenHash = hashToken(refreshToken);

    const session = await SessionRepo.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      return res.status(403).json({
        error: "Invalid session",
      });
    }

    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return res.status(403).json({
        error: "Session expired",
      });
    }

    const newAccessToken = createAccessTokenForUser({
      id: payload.id,
      phoneNumber: payload.phoneNumber,
    });

    await SessionRepo.updateLastUsed(session.id);

    res.cookie("accessToken", newAccessToken, {
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000,
    });

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

const invalidateRefreshTokenAndLogout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token required",
      });
    }

    const refreshTokenHash = hashToken(refreshToken);

    const session = await SessionRepo.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      res.clearCookie("accessToken", baseCookieOptions);
      res.clearCookie("refreshToken", baseCookieOptions);

      return res.status(404).json({
        message: "Session not found, but logged out on client",
      });
    }

    await SessionRepo.revokeSession(session.id);

    res.clearCookie("accessToken", {
      ...baseCookieOptions,
    });

    res.clearCookie("refreshToken", {
      ...baseCookieOptions,
    });

    return res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Logout failed",
    });
  }
};

const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await SessionRepo.revokeAllUserSessions(userId);
  await UserRepo.deleteUserById(userId);

  res.clearCookie("accessToken", baseCookieOptions);
  res.clearCookie("refreshToken", baseCookieOptions);

  return res.status(200).json({ message: "user deleted successfully" });
});

module.exports = {
  verifyOtp,
  refreshAccessToken,
  invalidateRefreshTokenAndLogout,
  deleteAccount,
};
