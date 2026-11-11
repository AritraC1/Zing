const CallsService = require("./calls.service");

class CallsController {
  constructor(callsService = new CallsService()) {
    this.callsService = callsService;
  }

  // GET /api/calls/history
  fetchCallHistory = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 100, 1),
        200,
      );

      const calls = await this.callsService.getCallHistory(userId, limit);

      return res.status(200).json({ calls });
    } catch (error) {
      next(error);
    }
  };
  // GET /api/calls/group-history
  fetchGroupCallHistory = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 100, 1),
        200,
      );

      const calls = await this.callsService.getGroupCallHistory(userId, limit);

      return res.status(200).json({ calls });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = CallsController;
module.exports.callsController = new CallsController();
