const GroupsRepository = require("./groups.repository");
const ChatRepository = require("../chat/chat.repository");
const UserRepository = require("../users/users.repository");
const { buildMediaUrl } = require("../../utils/mediaUrl");
const { withTransaction } = require("../../utils/withTransaction");
const AppError = require("../../core/errors/AppError");

// Hard cap: a group may hold at most 10 members (creator included).
const MAX_GROUP_MEMBERS = 10;

// Group membership changes are broadcast to every member's devices as
// `group:update` so clients can refresh their conversation lists.
const groupEvents = require("../chat/chat.events");

class GroupsService {
  constructor() {
    this.groupsRepo = new GroupsRepository();
    this.chatRepo = new ChatRepository();
    this.userRepo = new UserRepository();
  }

  shapeMember(row) {
    return {
      userId: row.userId,
      displayName: row.displayName || row.phoneNumber || "Member",
      phoneNumber: row.phoneNumber,
      role: row.role,
      avatarUrl: row.avatarKey ? buildMediaUrl(row.avatarKey) : null,
      joinedAt: row.joinedAt,
    };
  }

  // POST /api/groups — create a group with up to 9 invited members.
  async createGroup(currentUserId, name, memberIds = []) {
    const trimmed = (name || "").trim();
    if (!trimmed || trimmed.length > 100) {
      throw new AppError("Group name must be 1-100 characters", 400);
    }

    // Dedupe and never include the creator twice.
    const uniqueIds = [...new Set(memberIds.map(String))].filter(
      (id) => id !== String(currentUserId),
    );

    if (uniqueIds.length + 1 > MAX_GROUP_MEMBERS) {
      throw new AppError(
        `Groups can have at most ${MAX_GROUP_MEMBERS} members (you + ${MAX_GROUP_MEMBERS - 1} others)`,
        400,
      );
    }

    // Every invited user must exist.
    for (const memberId of uniqueIds) {
      const user = await this.userRepo.findByIdWithAvatar(memberId);
      if (!user) {
        throw new AppError("One of the selected users no longer exists", 400);
      }
    }

    const conversation = await this.groupsRepo.createGroup({
      creatorId: currentUserId,
      name: trimmed,
      memberIds: uniqueIds,
    });

    const members = (await this.groupsRepo.getMembers(conversation.id)).map(
      (row) => this.shapeMember(row),
    );

    // Tell every member (including the creator's other devices) a new
    // group exists so their chat lists pick it up immediately.
    groupEvents.notifyEvent(
      "group:update",
      { conversationId: conversation.id, action: "created" },
      members.map((member) => member.userId),
    );

    return { conversation, members, created: true };
  }

  // GET /api/groups/:conversationId — roster + metadata. Members only.
  async getGroupInfo(conversationId, currentUserId) {
    const group = await this.groupsRepo.getGroup(conversationId);
    if (!group) {
      throw new AppError("Group not found", 404);
    }

    const memberRows = await this.groupsRepo.getMembers(conversationId);
    const me = memberRows.find(
      (row) => String(row.userId) === String(currentUserId),
    );
    if (!me) {
      throw new AppError("Forbidden: not a group member", 403);
    }

    return {
      conversationId: group.id,
      name: group.name,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      myRole: me.role,
      members: memberRows.map((row) => this.shapeMember(row)),
    };
  }

  async assertAdmin(conversationId, currentUserId) {
    const group = await this.groupsRepo.getGroup(conversationId);
    if (!group) {
      throw new AppError("Group not found", 404);
    }

    const role = await this.groupsRepo.getMemberRole(
      conversationId,
      currentUserId,
    );
    if (!role) {
      throw new AppError("Forbidden: not a group member", 403);
    }
    if (role !== "admin") {
      throw new AppError("Only the group admin can do that", 403);
    }

    return group;
  }

  async memberIds(conversationId) {
    return (await this.groupsRepo.getMembers(conversationId)).map((row) =>
      String(row.userId),
    );
  }

  // PATCH /api/groups/:conversationId/name — admin only.
  async renameGroup(conversationId, currentUserId, name) {
    await this.assertAdmin(conversationId, currentUserId);

    const trimmed = (name || "").trim();
    if (!trimmed || trimmed.length > 100) {
      throw new AppError("Group name must be 1-100 characters", 400);
    }

    const updated = await this.groupsRepo.renameGroup(
      conversationId,
      trimmed,
    );
    if (!updated) {
      throw new AppError("Group not found", 404);
    }

    const memberIds = await this.memberIds(conversationId);
    groupEvents.notifyEvent(
      "group:update",
      {
        conversationId,
        action: "renamed",
        name: trimmed,
      },
      memberIds,
    );

    return { conversationId, name: trimmed };
  }

  // POST /api/groups/:conversationId/members — admin only, capped at 10.
  async addMembers(conversationId, currentUserId, memberIds = []) {
    await this.assertAdmin(conversationId, currentUserId);

    const uniqueIds = [...new Set(memberIds.map(String))];
    if (!uniqueIds.length) {
      throw new AppError("Select at least one member to add", 400);
    }

    const existing = await this.memberIds(conversationId);
    const newIds = uniqueIds.filter((id) => !existing.includes(id));
    if (!newIds.length) {
      return { conversationId, added: [] };
    }

    if (existing.length + newIds.length > MAX_GROUP_MEMBERS) {
      throw new AppError(
        `Groups can have at most ${MAX_GROUP_MEMBERS} members`,
        400,
      );
    }

    for (const memberId of newIds) {
      const user = await this.userRepo.findByIdWithAvatar(memberId);
      if (!user) {
        throw new AppError("One of the selected users no longer exists", 400);
      }
    }

    await this.groupsRepo.addMembers(conversationId, newIds);

    const memberIdsAll = await this.memberIds(conversationId);
    groupEvents.notifyEvent(
      "group:update",
      {
        conversationId,
        action: "members-added",
        addedIds: newIds,
      },
      memberIdsAll,
    );

    return { conversationId, added: newIds };
  }

  // DELETE /api/groups/:conversationId/members/:userId — admin only.
  // Admins cannot be removed (the creator is the single admin in v1);
  // members who want out use leave.
  async removeMember(conversationId, currentUserId, targetUserId) {
    await this.assertAdmin(conversationId, currentUserId);

    if (String(targetUserId) === String(currentUserId)) {
      throw new AppError("Use leave group instead", 400);
    }

    const role = await this.groupsRepo.getMemberRole(
      conversationId,
      targetUserId,
    );
    if (!role) {
      throw new AppError("That user is not a member of this group", 404);
    }
    if (role === "admin") {
      throw new AppError("The group admin cannot be removed", 403);
    }

    await this.groupsRepo.removeMember(conversationId, targetUserId);

    const memberIds = await this.memberIds(conversationId);
    groupEvents.notifyEvent(
      "group:update",
      {
        conversationId,
        action: "members-removed",
        removedIds: [String(targetUserId)],
      },
      [...memberIds, String(targetUserId)],
    );

    return { conversationId, removed: String(targetUserId) };
  }

  // POST /api/groups/:conversationId/leave — any member. If the admin
  // leaves, the earliest-joined remaining member is promoted so the
  // group keeps an admin; when the last member leaves the group is
  // deleted outright.
  async leaveGroup(conversationId, currentUserId) {
    const group = await this.groupsRepo.getGroup(conversationId);
    if (!group) {
      throw new AppError("Group not found", 404);
    }

    const role = await this.groupsRepo.getMemberRole(
      conversationId,
      currentUserId,
    );
    if (!role) {
      throw new AppError("Forbidden: not a group member", 403);
    }

    const memberIds = await this.memberIds(conversationId);

    if (memberIds.length === 1) {
      // Last one out closes the door: delete the whole conversation.
      await this.groupsRepo.deleteGroup(conversationId);
      groupEvents.notifyEvent(
        "group:update",
        { conversationId, action: "deleted" },
        [String(currentUserId)],
      );
      return { conversationId, deleted: true };
    }

    await withTransaction(async (client) => {
      await this.groupsRepo.removeMember(
        conversationId,
        currentUserId,
        client,
      );

      if (role === "admin") {
        const remaining = (
          await this.groupsRepo.getMembers(conversationId)
        )[0];
        if (remaining) {
          await this.groupsRepo.updateMemberRole(
            conversationId,
            remaining.userId,
            "admin",
            client,
          );
        }
      }
    });

    const remainingIds = await this.memberIds(conversationId);
    groupEvents.notifyEvent(
      "group:update",
      {
        conversationId,
        action: "member-left",
        leftId: String(currentUserId),
      },
      [...remainingIds, String(currentUserId)],
    );

    return { conversationId, left: true };
  }
}

module.exports = GroupsService;
