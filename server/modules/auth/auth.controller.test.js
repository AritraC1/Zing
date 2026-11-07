const authController = require("./auth.controller");
const UserRepo = require("../users/users.repo");
const SessionRepo = require("../sessions/sessions.repo");
const DevicesRepo = require("../devices/devices.repo");
const { createAccessTokenForUser, createRefreshTokenForUser, validateRefreshToken } = require("../../shared/utils/jwtTokenUtil");
const admin = require("../../config/firebase");

const mockAuth = admin._mockAuth;

// Mock all dependencies
jest.mock("../users/users.repo");
jest.mock("../sessions/sessions.repo");
jest.mock("../devices/devices.repo");
jest.mock("../../shared/utils/jwtTokenUtil");
jest.mock("../../shared/utils/hash");
jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "test-session-id"),
}));

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

describe("Auth Controller", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, cookies: {}, user: { id: "user-123" } };
    res = mockRes();
    jest.clearAllMocks();
    mockAuth.verifyIdToken.mockReset();
  });

  describe("verifyOtp", () => {
    it("returns 400 if phone number not in token", async () => {
      req.body = { idToken: "valid-token", deviceId: "dev-1", deviceType: "ios" };
      admin.auth().verifyIdToken.mockResolvedValue({ phone_number: null });

      await authController.verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Phone number not found in token" });
    });

    it("returns 401 if Firebase token is invalid", async () => {
      req.body = { idToken: "invalid-token", deviceId: "dev-1", deviceType: "ios" };
      admin.auth().verifyIdToken.mockRejectedValue(new Error("Invalid token"));

      await authController.verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired Firebase token" });
    });

    it("creates new user and returns onboarding token if user doesn't exist", async () => {
      req.body = { idToken: "valid-token", deviceId: "dev-1", deviceType: "ios" };
      admin.auth().verifyIdToken.mockResolvedValue({ phone_number: "+15551234567" });
      UserRepo.findByPhone.mockResolvedValue(null);
      UserRepo.createUser.mockResolvedValue({ id: "new-user-id", phone_number: "+15551234567" });
      createAccessTokenForUser.mockReturnValue("onboarding-token");

      await authController.verifyOtp(req, res);

      expect(UserRepo.createUser).toHaveBeenCalledWith("+15551234567");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        isNewUser: true,
        profileCompleted: false,
        accessToken: "onboarding-token",
      }));
    });

    it("returns access/refresh tokens for existing user", async () => {
      req.body = { idToken: "valid-token", deviceId: "dev-1", deviceType: "ios" };
      admin.auth().verifyIdToken.mockResolvedValue({ phone_number: "+15551234567" });
      UserRepo.findByPhone.mockResolvedValue({ id: "existing-user", phone_number: "+15551234567", profile_completed: true });
      createAccessTokenForUser.mockReturnValue("access-token");
      createRefreshTokenForUser.mockReturnValue("refresh-token");
      DevicesRepo.findById.mockResolvedValue(null);
      DevicesRepo.createDevice.mockResolvedValue({ id: "dev-1" });
      SessionRepo.revokeDeviceSessions.mockResolvedValue();
      SessionRepo.createSession.mockResolvedValue();

      await authController.verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        isNewUser: false,
        profileCompleted: true,
        accessToken: "access-token",
      }));
      expect(res.cookie).toHaveBeenCalledWith("accessToken", "access-token", expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith("refreshToken", "refresh-token", expect.any(Object));
    });
  });

  describe("refreshAccessToken", () => {
    it("returns 401 if refresh token missing", async () => {
      req.cookies = {};

      await authController.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Refresh token required" });
    });

    it("returns 403 if session not found", async () => {
      req.cookies = { refreshToken: "valid-refresh" };
      validateRefreshToken.mockReturnValue({ id: "user-123", phoneNumber: "+15551234567" });
      const hash = require("../../shared/utils/hash");
      hash.mockReturnValue("hashed-token");
      SessionRepo.findByRefreshTokenHash.mockResolvedValue(null);

      await authController.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid session" });
    });

    it("returns new access token on success", async () => {
      req.cookies = { refreshToken: "valid-refresh" };
      validateRefreshToken.mockReturnValue({ id: "user-123", phoneNumber: "+15551234567" });
      const hash = require("../../shared/utils/hash");
      hash.mockReturnValue("hashed-token");
      SessionRepo.findByRefreshTokenHash.mockResolvedValue({ id: "session-1", expires_at: new Date(Date.now() + 86400000) });
      createAccessTokenForUser.mockReturnValue("new-access-token");
      SessionRepo.updateLastUsed.mockResolvedValue();

      await authController.refreshAccessToken(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "New access token generated",
        accessToken: "new-access-token",
      }));
    });
  });

  describe("invalidateRefreshTokenAndLogout", () => {
    it("clears cookies and returns success", async () => {
      req.cookies = { refreshToken: "valid-refresh" };
      const hash = require("../../shared/utils/hash");
      hash.mockReturnValue("hashed-token");
      SessionRepo.findByRefreshTokenHash.mockResolvedValue({ id: "session-1" });
      SessionRepo.revokeSession.mockResolvedValue();

      await authController.invalidateRefreshTokenAndLogout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith("accessToken", expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
    });
  });

  describe("deleteAccount", () => {
    it("deletes user and revokes sessions", async () => {
      req.user = { id: "user-123" };
      const next = jest.fn();
      SessionRepo.revokeAllUserSessions.mockResolvedValue();
      UserRepo.deleteUserById.mockResolvedValue();

      // Call the handler directly to see what happens
      let error = null;
      let result;
      try {
        result = await authController.deleteAccount(req, res, next);
      } catch (e) {
        error = e;
      }
      console.log("error:", error);
      console.log("deleteAccount result:", result);
      console.log("res.status calls:", res.status.mock.calls);
      console.log("res.json calls:", res.json.mock.calls);
      console.log("next calls:", next.mock.calls);

      expect(SessionRepo.revokeAllUserSessions).toHaveBeenCalledWith("user-123");
      expect(UserRepo.deleteUserById).toHaveBeenCalledWith("user-123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "user deleted successfully" });
      expect(next).not.toHaveBeenCalled();
    });
  });
});