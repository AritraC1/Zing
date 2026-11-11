const BlocksRepository = require("./blocks.repository");
const AppError = require("../../core/errors/AppError");

class BlocksController {
  constructor(blocksRepo = new BlocksRepository()) {
    this.blocksRepo = blocksRepo;
  }

  // POST /api/blocks/block
  block = async (req, res, next) => {
    try {
      const blockerId = req.user.id;
      const { userId: blockedId } = req.body;

      if (String(blockedId) === String(blockerId)) {
        throw new AppError("You cannot block yourself", 400);
      }

      await this.blocksRepo.blockUser(blockerId, blockedId);

      return res.status(200).json({ message: "Contact blocked" });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/blocks/unblock
  unblock = async (req, res, next) => {
    try {
      const blockerId = req.user.id;
      const { userId: blockedId } = req.body;

      const removed = await this.blocksRepo.unblockUser(blockerId, blockedId);

      return res.status(200).json({
        message: removed ? "Contact unblocked" : "Contact was not blocked",
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/blocks/blocked
  listBlocked = async (req, res, next) => {
    try {
      const blockedUserIds = await this.blocksRepo.getBlockedUserIds(
        req.user.id,
      );

      return res.status(200).json({ blockedUserIds });
    } catch (error) {
      next(error);
    }
  };
}

const blocksController = new BlocksController();

module.exports = { BlocksController, blocksController };
