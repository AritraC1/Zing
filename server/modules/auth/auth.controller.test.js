const { AuthController } = require("./auth.controller");
const verifyOtpSchema = require("../../core/validation/schemas");
const AppError = require("../../core/errors/AppError");

const VALID_BODY = {
  idToken: "valid-firebase-token",
  deviceId: "e9ee1ebf-68b5-4c31-8fbb-100da424740b",
  deviceType: "web",
};

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

describe("AuthController", () => {
  let controller;
  let authService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    authService = {
      verifyOtp: jest.fn(),
      refreshAccessToken: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
    };
    controller = new AuthController(authService);

    req = { body: {}, cookies: {}, user: { id: "user-123" } };
    res = mockRes();
    next = jest.fn();
  });

  describe("verifyOtp", () => {
    it("responds 200 with wrapped DTO and issues cookies for an existing user", async () => {
      req.body = VALID_BODY;
      authService.verifyOtp.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isNewUser: false,
        onboardingCompleted: true,
      });

      await controller.verifyOtp(req, res, next);

      expect(authService.verifyOtp).toHaveBeenCalledWith(VALID_BODY);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          isNewUser: false,
          onboardingCompleted: true,
          accessToken: "access-token",
        },
      });
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "access-token",
        expect.any(Object),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh-token",
        expect.any(Object),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("issues only a short-lived access token cookie for a new user", async () => {
      req.body = VALID_BODY;
      authService.verifyOtp.mockResolvedValue({
        accessToken: "onboarding-token",
        refreshToken: null,
        isNewUser: true,
        onboardingCompleted: false,
      });

      await controller.verifyOtp(req, res, next);

      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "onboarding-token",
        expect.objectContaining({ maxAge: 10 * 60 * 1000 }),
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          isNewUser: true,
          onboardingCompleted: false,
          accessToken: "onboarding-token",
        },
      });
    });

    it("rejects an invalid body without hitting the service", async () => {
      req.body = { idToken: "", deviceId: "not-a-uuid", deviceType: "web" };

      await controller.verifyOtp(req, res, next);

      expect(authService.verifyOtp).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Validation failed");
      expect(error.details).toHaveProperty("idToken");
      expect(res.status).not.toHaveBeenCalled();
    });

    it("forwards service errors to the error middleware", async () => {
      req.body = VALID_BODY;
      const failure = new AppError("Invalid or expired Firebase token", 401);
      authService.verifyOtp.mockRejectedValue(failure);

      await controller.verifyOtp(req, res, next);

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("refreshAccessToken", () => {
    it("responds 200 with a new access token and cookie", async () => {
      req.cookies = { refreshToken: "valid-refresh" };
      authService.refreshAccessToken.mockResolvedValue({
        accessToken: "new-access-token",
      });

      await controller.refreshAccessToken(req, res, next);

      expect(authService.refreshAccessToken).toHaveBeenCalledWith(
        "valid-refresh",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { accessToken: "new-access-token" },
      });
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "new-access-token",
        expect.objectContaining({ maxAge: 15 * 60 * 1000 }),
      );
      expect(res.cookie).not.toHaveBeenCalledWith(
        "refreshToken",
        expect.anything(),
        expect.anything(),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("forwards errors (401/403) from the service", async () => {
      req.cookies = {};
      const failure = new AppError("Refresh token required", 401);
      authService.refreshAccessToken.mockRejectedValue(failure);

      await controller.refreshAccessToken(req, res, next);

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("revokes the session, clears cookies and responds 200", async () => {
      req.cookies = { refreshToken: "valid-refresh" };
      authService.logout.mockResolvedValue({ loggedOut: true });

      await controller.logout(req, res, next);

      expect(authService.logout).toHaveBeenCalledWith("valid-refresh");
      expect(res.clearCookie).toHaveBeenCalledWith(
        "accessToken",
        expect.any(Object),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        "refreshToken",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Logged out successfully",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("forwards service errors to the error middleware", async () => {
      req.cookies = {};
      const failure = new AppError("Refresh token required", 400);
      authService.logout.mockRejectedValue(failure);

      await controller.logout(req, res, next);

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.clearCookie).not.toHaveBeenCalled();
    });
  });

  describe("deleteAccount", () => {
    it("deletes the account, clears cookies and responds 200", async () => {
      req.user = { id: "user-123" };
      authService.deleteAccount.mockResolvedValue({ deleted: true });

      await controller.deleteAccount(req, res, next);

      expect(authService.deleteAccount).toHaveBeenCalledWith("user-123");
      expect(res.clearCookie).toHaveBeenCalledWith(
        "accessToken",
        expect.any(Object),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        "refreshToken",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Account deleted successfully",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("forwards service errors to the error middleware", async () => {
      const failure = new AppError("User not found", 404);
      authService.deleteAccount.mockRejectedValue(failure);

      await controller.deleteAccount(req, res, next);

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("schema", () => {
    it("exposes the expected verify-otp schema", () => {
      expect(verifyOtpSchema.verifyOtpSchema.safeParse(VALID_BODY).success).toBe(
        true,
      );
    });
  });
});
