const GroupsService = require("./groups.service");

class GroupsController {
  constructor(groupsService = new GroupsService()) {
    this.groupsService = groupsService;
  }

  // POST /api/groups
  createGroup = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { name, memberIds } = req.body || {};

      const result = await this.groupsService.createGroup(
        userId,
        name,
        Array.isArray(memberIds) ? memberIds : [],
      );

      return res.status(201).json({
        conversationId: result.conversation.id,
        name: result.conversation.name,
        members: result.members,
        message: "Group created",
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/groups/:conversationId
  getGroupInfo = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const info = await this.groupsService.getGroupInfo(
        conversationId,
        userId,
      );

      return res.status(200).json(info);
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/groups/:conversationId/name
  renameGroup = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { name } = req.body || {};

      const result = await this.groupsService.renameGroup(
        conversationId,
        userId,
        name,
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/groups/:conversationId/members
  addMembers = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { memberIds } = req.body || {};

      const result = await this.groupsService.addMembers(
        conversationId,
        userId,
        Array.isArray(memberIds) ? memberIds : [],
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/groups/:conversationId/members/:userId
  removeMember = async (req, res, next) => {
    try {
      const { conversationId, userId: targetUserId } = req.params;
      const currentUserId = req.user.id;

      const result = await this.groupsService.removeMember(
        conversationId,
        currentUserId,
        targetUserId,
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/groups/:conversationId/leave
  leaveGroup = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const result = await this.groupsService.leaveGroup(
        conversationId,
        userId,
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

const groupsController = new GroupsController();

module.exports = { GroupsController, groupsController };
