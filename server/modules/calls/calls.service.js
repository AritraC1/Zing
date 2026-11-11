const CallsRepository = require("./calls.repository");
const { buildMediaUrl } = require("../../utils/mediaUrl");

// Shape a raw joined row for API responses.
const shapeCall = (row, meId) => ({
  id: row.id,
  conversationId: row.conversation_id,
  // From this user's point of view
  direction: row.caller_id === meId ? "outgoing" : "incoming",
  callType: row.callType,
  status: row.status,
  startedAt: row.startedAt,
  answeredAt: row.answeredAt,
  endedAt: row.endedAt,
  durationSeconds: row.durationSeconds,
  peer: {
    id: row.peerId,
    name: row.peerName || row.peerPhone,
    phone: row.peerPhone,
    avatarUrl: buildMediaUrl(row.peerAvatarKey),
  },
});

class CallsService {
  constructor() {
    this.callsRepo = new CallsRepository();
  }

  async getCallHistory(userId, limit = 100) {
    const rows = await this.callsRepo.getCallHistory(userId, limit);

    return rows.map((row) => shapeCall(row, userId));
  }

  // Group calls: the "peer" is the group itself — the calls list shows
  // the group name with the participant count of that call.
  async getGroupCallHistory(userId, limit = 100) {
    const rows = await this.callsRepo.getGroupCallHistory(userId, limit);

    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      isGroup: true,
      direction: row.isInitiator ? "outgoing" : "incoming",
      callType: row.callType,
      // History display statuses are the 1:1 vocabulary; a group call
      // that ran to completion reads as 'answered'.
      status: row.status === "ended" ? "answered" : row.status,
      startedAt: row.startedAt,
      answeredAt: null,
      endedAt: row.endedAt,
      durationSeconds: row.durationSeconds,
      participantCount: row.participantCount,
      peer: {
        id: row.conversation_id,
        name: row.groupName || "Group",
        phone: null,
        avatarUrl: buildMediaUrl(row.groupAvatarKey),
      },
    }));
  }
}

module.exports = CallsService;
