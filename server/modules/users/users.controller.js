const { parseBody } = require("../../core/validation/parseBody");
const { onboardSchema } = require("../../core/validation/schemas");
const { issueCookies } = require("../../utils/issueCookies");
const UserService = require("./users.service");

class UserController {
  constructor(userService = new UserService()) {
    this.userService = userService;
  }

  // POST /api/users/onboard
  onBoardNewUser = async (req, res, next) => {
    try {
      const data = parseBody(onboardSchema, req.body);

      const { profile, accessToken, refreshToken } =
        await this.userService.onboardUser({
          phoneNumber: req.user.phoneNumber,
          ...data,
        });

      issueCookies(res, { accessToken, refreshToken });

      res.status(200).json({
        success: true,
        message: "Onboarding complete",
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/users/me
  fetchMyProfile = async (req, res, next) => {
    try {
      const user = await this.userService.fetchMyProfile(req.user.phoneNumber);

      res.status(200).json({
        success: true,
        message: "Successfully fetched user profile",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/users/update-profile
  updateProfile = async (req, res, next) => {
    try {
      const user = await this.userService.updateProfile({
        phoneNumber: req.user.phoneNumber,
        newDisplayName: req.body.newDisplayName,
      });

      res.status(200).json({
        success: true,
        message: "User details updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/users/upload-avatar
  uploadAvatar = async (req, res, next) => {
    try {
      if (!req.file?.path) {
        return res.status(400).json({
          success: false,
          message: "File is required",
        });
      }

      const data = await this.userService.uploadAvatar({
        userId: req.user.id,
        localFilePath: req.file.path,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      });

      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/users/search
  fetchUsersByPhone = async (req, res, next) => {
    try {
      const user = await this.userService.fetchUserByPhone(
        req.query.phoneNumber,
      );

      res.status(200).json({
        success: true,
        message: "User found",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };
}

const usersController = new UserController();

module.exports = { UserController, usersController };
