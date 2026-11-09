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
}

module.exports = CallsService;
