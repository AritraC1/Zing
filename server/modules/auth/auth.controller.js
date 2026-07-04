const crypto = require("crypto");
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

// Request OTP
// const requestOtp = async (req, res) => {
//   try {
//     const { phoneNumber } = req.body;

//     if (!phoneNumber) {
//       return res.status(400).json({
//         error: "phone number is required",
//       });
//     }

//     const key = `otp:${phoneNumber}`;

//     // Check existing OTP first
//     let otp = await redis.get(key);

//     if (!otp) {
//       otp = generateOtp();
//       await redis.set(key, otp, "EX", 300);
//     }

//     return res.status(200).json({
//       message: `OTP Sent to ${phoneNumber}`,
//       otp,
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: "Failed to send OTP",
//     });
//   }
// };

// Verify OTP

const verifyOtp = async (req, res) => {
  try {
    const { idToken, deviceId, deviceType } = req.body;

    if (!idToken || !deviceId || !deviceType) {
      return res.status(400).json({
        error: "idToken, deviceId, and deviceType are required",
      });
    }

    // Verify firebase token
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

    // Check if user exists
    let user = await UserRepo.findByPhone(phoneNumber);

    const isNewUser = !user;

    // If NEW USER → just return (NO session, NO user creation)
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

    // EXISTING USER → create session

    // Generate Token for the user
    const accessToken = createAccessTokenForUser({
      id: user.id,
      phoneNumber,
    });
    const refreshToken = createRefreshTokenForUser({
      id: user.id,
      phoneNumber,
    });

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
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000, // 15 min
    });

    // Refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      ...baseCookieOptions,
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
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

// Resend OTP
// const resendOtp = async (req, res) => {
//   try {
//     const { phoneNumber } = req.body;

//     if (!phoneNumber) {
//       return res.status(400).json({
//         error: "phone number is required",
//       });
//     }

//     const key = `otp:${phoneNumber}`;

//     // Check existing OTP first
//     let otp = await redis.get(key);

//     if (!otp) {
//       otp = generateOtp();
//       await redis.set(key, otp, "EX", 300);
//     }

//     return res.status(200).json({
//       message: `OTP Sent to ${phoneNumber}`,
//       otp,
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: "Failed to resend OTP",
//     });
//   }
// };

// Refresh access token

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh token required",
      });
    }

    // verify jwt
    const payload = validateRefreshToken(refreshToken);

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

    // generate new access token
    const newAccessToken = createAccessTokenForUser({
      id: payload.id,
      phoneNumber: payload.phoneNumber,
    });

    // update last used
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

// Logout
const invalidateRefreshTokenAndLogout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

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
      // Still clear cookies
      res.clearCookie("accessToken", baseCookieOptions);
      res.clearCookie("refreshToken", baseCookieOptions);

      return res.status(404).json({
        message: "Session not found, but logged out on client",
      });
    }

    // revoke session
    await SessionRepo.revokeSession(session.id);

    // clear cookies AFTER successful revoke
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

// Delete Account
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
