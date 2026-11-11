const crypto = require("crypto");
const { getFirebaseAdmin } = require("../../core/config/firebase.config");
const UserRepository = require("../users/users.repository");
const SessionRepository = require("../sessions/sessions.repository");
const DeviceRepository = require("../device/device.repository");
const {
  createAccessTokenForUser,
  createRefreshTokenForUser,
  validateRefreshToken,
} = require("../../utils/jwtTokenUtil");
const hashToken = require("../../utils/hash");
const { REFRESH_TOKEN_MAX_AGE } = require("../../utils/issueCookies");
const AppError = require("../../core/errors/AppError");

class AuthService {
  constructor() {
    this.userRepo = new UserRepository();
    this.sessionRepo = new SessionRepository();
    this.deviceRepo = new DeviceRepository();
  }

  // Verify the Firebase OTP token, create the user if new, and issue tokens
  async verifyOtp({ idToken, deviceId, deviceType }) {
    const admin = getFirebaseAdmin();

    if (!admin) {
      throw new AppError(
        "Authentication is not configured on this server (missing Firebase service account)",
        503,
      );
    }

    let phoneNumber;

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      phoneNumber = decodedToken.phone_number;
    } catch (error) {
      console.error("Firebase token verification failed:", error);
      throw new AppError("Invalid or expired Firebase token", 401);
    }

    if (!phoneNumber) {
      throw new AppError("Phone number not found in token", 400);
    }

    let user = await this.userRepo.findByPhone(phoneNumber);

    const isNewUser = !user;

    if (isNewUser) {
      user = await this.userRepo.createUser(phoneNumber);

      // Short-lived token used only to complete onboarding
      const accessToken = createAccessTokenForUser({
        id: user.id,
        phoneNumber,
      });

      return {
        accessToken,
        refreshToken: null,
        isNewUser: true,
        onboardingCompleted: false,
      };
    }

    const accessToken = createAccessTokenForUser({
      id: user.id,
      phoneNumber,
    });
    const refreshToken = createRefreshTokenForUser({
      id: user.id,
      phoneNumber,
    });

    let device = await this.deviceRepo.findById(deviceId);

    if (!device) {
      device = await this.deviceRepo.createDevice({
        id: deviceId,
        userId: user.id,
        deviceType,
        identityPublicKey: "TEST_PUBLIC_KEY",
      });
    }

    // One active session per device
    await this.sessionRepo.revokeDeviceSessions(deviceId);

    await this.sessionRepo.createSession({
      id: crypto.randomUUID(),
      deviceId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
    });

    return {
      accessToken,
      refreshToken,
      isNewUser: false,
      onboardingCompleted: Boolean(user.profile_completed),
    };
  }

  // Trade a valid refresh token for a new access token
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new AppError("Refresh token required", 401);
    }

    let payload;

    try {
      payload = validateRefreshToken(refreshToken);
    } catch (error) {
      throw new AppError("Invalid refresh token", 403);
    }

    const session = await this.sessionRepo.findByRefreshTokenHash(
      hashToken(refreshToken),
    );

    if (!session) {
      throw new AppError("Invalid session", 403);
    }

    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      throw new AppError("Session expired", 403);
    }

    await this.sessionRepo.updateLastUsed(session.id);

    const accessToken = createAccessTokenForUser({
      id: payload.id,
      phoneNumber: payload.phoneNumber,
    });

    return { accessToken };
  }

  // Revoke the session tied to a refresh token (idempotent)
  async logout(refreshToken) {
    if (!refreshToken) {
      throw new AppError("Refresh token required", 400);
    }

    const session = await this.sessionRepo.findByRefreshTokenHash(
      hashToken(refreshToken),
    );

    if (session) {
      await this.sessionRepo.revokeSession(session.id);
    }

    return { loggedOut: true };
  }

  // Revoke every session of the user and delete the account
  async deleteAccount(userId) {
    await this.sessionRepo.revokeAllUserSessions(userId);
    await this.userRepo.deleteUserById(userId);

    return { deleted: true };
  }
}

module.exports = AuthService;
