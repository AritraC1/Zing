const { verifyOtpSchema } = require("../../core/validation/schemas");
const { parseBody } = require("../../core/validation/parseBody");
const {
  issueCookies,
  clearAuthCookies,
} = require("../../utils/issueCookies");
const AuthService = require("./auth.service");

class AuthController {
  constructor(authService = new AuthService()) {
    this.authService = authService;
  }

  // POST /api/auth/verify-otp
  verifyOtp = async (req, res, next) => {
    try {
      const data = parseBody(verifyOtpSchema, req.body);

      const { accessToken, refreshToken, isNewUser, onboardingCompleted } =
        await this.authService.verifyOtp(data);

      issueCookies(res, {
        accessToken,
        refreshToken,
        shortLived: !refreshToken,
      });

      res.status(200).json({
        success: true,
        data: { isNewUser, onboardingCompleted, accessToken },
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/refresh
  refreshAccessToken = async (req, res, next) => {
    try {
      const { accessToken } = await this.authService.refreshAccessToken(
        req.cookies?.refreshToken,
      );

      issueCookies(res, { accessToken });

      res.status(200).json({
        success: true,
        data: { accessToken },
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/logout
  logout = async (req, res, next) => {
    try {
      await this.authService.logout(req.cookies?.refreshToken);

      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/auth/delete-account
  deleteAccount = async (req, res, next) => {
    try {
      await this.authService.deleteAccount(req.user.id);

      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: "Account deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}

const authController = new AuthController();

module.exports = { AuthController, authController };
