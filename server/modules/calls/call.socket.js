// Call Socket — WebRTC signaling relay for 1:1 audio/video calls.
//
// The server never touches media: it only validates + authenticates who is
// allowed to talk to whom, fans signaling messages out to each peer's
// personal room (user:<id>), and persists call history to the calls table.
// Audio/video flows directly between the two browsers once ICE connects.

const ChatRepository = require("../chat/chat.repository");
const { assertConversationParticipant } = require("../chat/chat.access");
const CallsRepository = require("./calls.repository");
const BlocksRepository = require("../blocks/blocks.repository");
const { isUserOnline, userRoom } = require("../../core/sockets/presence");
const UserRepository = require("../users/users.repository");
const { buildMediaUrl } = require("../../utils/mediaUrl");
const callState = require("./callState");

const RING_TIMEOUT_MS = 45 * 1000;

const callsRepo = new CallsRepository();
const chatRepo = new ChatRepository();
const userRepo = new UserRepository();
const blocksRepo = new BlocksRepository();

// callId -> { callerId, calleeId, conversationId, callType, status, timeout }
const { activeCalls } = callState;

function emitToUser(io, userId, event, payload) {
  io.to(userRoom(userId)).emit(event, payload);
}

function findActiveCallForUser(userId) {
  for (const call of activeCalls.values()) {
    if (call.callerId === userId || call.calleeId === userId) return call;
  }
  return null;
}

function clearRingTimeout(call) {
  if (call.timeout) {
    clearTimeout(call.timeout);
    call.timeout = null;
  }
}

// Terminal cleanup: forget the call, stamp the DB row, notify both sides.
// `status` is the persisted outcome; `notifyEvent`/reason drive the client.
// `durationSeconds` is the duration reported by the hangup client, if any.
async function terminateCall(io, call, status, notifyEvent, reason, durationSeconds = null) {
  if (activeCalls.get(call.callId) === call) {
    activeCalls.delete(call.callId);
  }
  clearRingTimeout(call);

  try {
    await callsRepo.markCallEnded(call.callId, status, durationSeconds);
  } catch (err) {
    console.error("markCallEnded error:", err.message);
  }

  const payload = { callId: call.callId, reason };
  if (call.callerId && notifyEvent) {
    emitToUser(io, call.callerId, notifyEvent, payload);
  }
  if (call.calleeId && notifyEvent) {
    emitToUser(io, call.calleeId, notifyEvent, payload);
  }
}

// Status transition on accept. Only the ringing -> answered race winner
// gets null; losers get a string so callers can reject the accept.
async function acceptRingingCall(call) {
  if (call.status !== "ringing") return "already-decided";
  const updated = await callsRepo.markCallAnswered(call.callId);
  if (!updated) return "already-decided";
  call.status = "active";
  return null;
}

// Relay a signaling payload from one validated participant to the other.
function relayCallEvent(io, call, userId, event, payload) {
  if (call.callerId === userId) {
    emitToUser(io, call.calleeId, event, payload);
  } else {
    emitToUser(io, call.callerId, event, payload);
  }
}

module.exports = (io) => {
  // Repair call rows orphaned by previous server lifetimes (restarts leave
  // calls with no ended_at, so history could never show a duration).
  callsRepo.endOrphanedCalls().catch((err) => {
    console.error("endOrphanedCalls error:", err.message);
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    // ---------------------------------------------------------------
    // Caller starts ringing
    // ---------------------------------------------------------------
    socket.on("call:ring", async (payload, ack) => {
      const { conversationId, calleeId, callType } = payload || {};
      const respond = typeof ack === "function" ? ack : () => {};

      try {
        if (
          !conversationId ||
          !calleeId ||
          !["audio", "video"].includes(callType) ||
          calleeId === userId
        ) {
          respond({ error: "conversationId, calleeId and callType are required" });
          return;
        }

        const participants = await assertConversationParticipant(
          conversationId,
          userId,
        );

        const isCallee = participants.some(
          ({ user_id }) => String(user_id) === String(calleeId),
        );
        if (!isCallee) {
          respond({ error: "Callee is not a participant in this conversation" });
          return;
        }

        // A block in either direction stops calls for the pair, exactly
        // like it stops messaging.
        const blocked = await blocksRepo.findBlockedBetween(userId, [calleeId]);
        if (blocked) {
          const youBlocked = String(blocked.blocker_id) === String(userId);
          respond({
            error: youBlocked
              ? "You blocked this contact. Unblock them to make calls."
              : "You can't call this contact.",
            reason: "blocked",
          });
          return;
        }

        if (findActiveCallForUser(userId)) {
          respond({ error: "You are already in a call" });
          return;
        }

        if (findActiveCallForUser(calleeId)) {
          respond({ error: "User is busy", reason: "busy" });
          return;
        }

        // A user can be in exactly one call app-wide, across types.
        if (callState.isUserInGroupCall(calleeId)) {
          respond({ error: "User is busy", reason: "busy" });
          return;
        }

        if (!(await isUserOnline(calleeId))) {
          respond({ error: "User is not available", reason: "unavailable" });
          return;
        }

        const call = await callsRepo.createCall({
          conversationId,
          callerId: userId,
          calleeId,
          callType,
        });

        const active = {
          callId: call.id,
          conversationId,
          callerId: userId,
          calleeId,
          callType,
          status: "ringing",
          timeout: null,
        };
        activeCalls.set(active.callId, active);

        // Prolonged ringing auto-fails as a missed call for both sides.
        active.timeout = setTimeout(() => {
          terminateCall(io, active, "missed", "call:missed", "missed");
        }, RING_TIMEOUT_MS);

        const callerUser = await userRepo.findByIdWithAvatar(userId);

        emitToUser(io, calleeId, "call:incoming", {
          callId: active.callId,
          conversationId,
          callType,
          callerId: userId,
          callerName:
            callerUser?.display_name ||
            callerUser?.phone_number ||
            "Unknown caller",
          callerAvatarUrl: callerUser?.avatar_storage_key
            ? buildMediaUrl(callerUser.avatar_storage_key)
            : null,
        });

        respond({ callId: active.callId });
      } catch (err) {
        console.error("call:ring error:", err.message);
        respond({ error: err.message || "Failed to start call" });
      }
    });

    // ---------------------------------------------------------------
    // Callee accepts — media negotiating happens in offer/answer below
    // ---------------------------------------------------------------
    socket.on("call:accept", async ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call || call.calleeId !== userId) {
        socket.emit("call:error", { callId, message: "No such incoming call" });
        return;
      }

      const race = await acceptRingingCall(call);
      if (race) {
        socket.emit("call:error", {
          callId,
          message: "Call already answered or ended",
        });
        return;
      }

      clearRingTimeout(call);
      emitToUser(io, call.callerId, "call:accepted", { callId });
    });

    // ---------------------------------------------------------------
    // Callee declines
    // ---------------------------------------------------------------
    socket.on("call:reject", ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call || call.calleeId !== userId) return;

      terminateCall(io, call, "rejected", "call:rejected", "declined");
    });

    // ---------------------------------------------------------------
    // Caller hangs up before the callee answers
    // ---------------------------------------------------------------
    socket.on("call:cancel", ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call || call.callerId !== userId) return;

      terminateCall(io, call, "cancelled", "call:cancelled", "cancelled");
    });

    // ---------------------------------------------------------------
    // Either side hangs up after answering
    // ---------------------------------------------------------------
    socket.on("call:end", ({ callId, durationSeconds }) => {
      const call = activeCalls.get(callId);
      if (!call || (call.callerId !== userId && call.calleeId !== userId)) {
        return;
      }

      const reported = Number(durationSeconds);
      terminateCall(
        io,
        call,
        "answered",
        "call:ended",
        "ended",
        Number.isFinite(reported) && reported >= 0 ? reported : null,
      );
    });

    // ---------------------------------------------------------------
    // Mid-call renegotiation (e.g. switching an audio call to video).
    // Unlike the initial offer/answer, either side may initiate these.
    // ---------------------------------------------------------------
    socket.on("call:renegotiate", ({ callId, offer }) => {
      if (!callId || !offer) return;
      const call = activeCalls.get(callId);
      if (
        !call ||
        (call.callerId !== userId && call.calleeId !== userId) ||
        call.status !== "active"
      ) {
        return;
      }

      relayCallEvent(io, call, userId, "call:renegotiate", { callId, offer });
    });

    socket.on("call:renegotiate-answer", ({ callId, answer }) => {
      if (!callId || !answer) return;
      const call = activeCalls.get(callId);
      if (
        !call ||
        (call.callerId !== userId && call.calleeId !== userId) ||
        call.status !== "active"
      ) {
        return;
      }

      relayCallEvent(io, call, userId, "call:renegotiate-answer", {
        callId,
        answer,
      });
    });

    // Either side flipped the call's mode (audio <-> video); keep the peer's
    // UI in sync and remember it for history.
    socket.on("call:type-changed", ({ callId, callType: newType }) => {
      if (!callId || !["audio", "video"].includes(newType)) return;
      const call = activeCalls.get(callId);
      if (
        !call ||
        (call.callerId !== userId && call.calleeId !== userId) ||
        call.status !== "active" ||
        call.callType === newType
      ) {
        return;
      }

      call.callType = newType;
      relayCallEvent(io, call, userId, "call:type-changed", {
        callId,
        callType: newType,
      });
      callsRepo.updateCallType(call.callId, newType).catch((err) => {
        console.error("updateCallType error:", err.message);
      });
    });

    // ---------------------------------------------------------------
    // WebRTC signaling relay (validated to the two participants only).
    // Offers may only come from the caller, answers from the callee.
    // ---------------------------------------------------------------
    socket.on("call:offer", ({ callId, offer }) => {
      if (!callId || !offer) return;
      const call = activeCalls.get(callId);
      if (!call || call.callerId !== userId || call.status !== "active") return;

      emitToUser(io, call.calleeId, "call:offer", { callId, offer });
    });

    socket.on("call:answer", ({ callId, answer }) => {
      if (!callId || !answer) return;
      const call = activeCalls.get(callId);
      if (!call || call.calleeId !== userId || call.status !== "active") return;

      emitToUser(io, call.callerId, "call:answer", { callId, answer });
    });

    socket.on("call:ice-candidate", ({ callId, candidate }) => {
      if (!callId || !candidate) return;
      const call = activeCalls.get(callId);
      if (
        !call ||
        (call.callerId !== userId && call.calleeId !== userId) ||
        call.status !== "active"
      ) {
        return;
      }

      const peerId = call.callerId === userId ? call.calleeId : call.callerId;
      emitToUser(io, peerId, "call:ice-candidate", { callId, candidate });
    });

    // ---------------------------------------------------------------
    // Socket dropped mid-call: treat exactly like hanging up so the
    // peer is never left in a ghost call.
    // ---------------------------------------------------------------
    socket.on("disconnect", () => {
      const openCalls = Array.from(activeCalls.values()).filter(
        (call) => call.callerId === userId || call.calleeId === userId,
      );

      openCalls.forEach((call) => {
        if (call.status === "ringing" && call.callerId === userId) {
          terminateCall(io, call, "cancelled", "call:cancelled", "cancelled");
        } else if (call.status === "ringing") {
          terminateCall(io, call, "missed", "call:missed", "missed");
        } else {
          terminateCall(io, call, "answered", "call:ended", "ended");
        }
      });
    });
  });
};

module.exports.activeCalls = activeCalls;
module.exports.findActiveCallForUser = findActiveCallForUser;
