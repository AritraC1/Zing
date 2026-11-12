// Group Call Socket — SFU signaling for group audio/video calls.
//
// Media never flows between peers: every participant publishes one
// upstream (audio + simulcast video) to a mediasoup room and subscribes
// to everyone else's layers through it. This module handles only the
// control plane — room membership, transport/producer/consumer setup,
// call lifecycle and history — with the authorization rules enforced
// server-side:
//   - only group members may ring or join a call in their conversation
//   - a call room holds at most MAX_PARTICIPANTS (5) live participants
//   - a user may be in exactly one group call at a time

const { Room } = require("../../sfu/room");
const { MAX_PARTICIPANTS } = require("../../sfu/config");
const CallsRepository = require("./calls.repository");
const ChatRepository = require("../chat/chat.repository");
const UserRepository = require("../users/users.repository");
const { assertConversationParticipant } = require("../chat/chat.access");
const { isUserOnline, userRoom } = require("../../core/sockets/presence");
const { buildMediaUrl } = require("../../utils/mediaUrl");
const callState = require("./callState");

const callsRepo = new CallsRepository();
const chatRepo = new ChatRepository();
const userRepo = new UserRepository();

// callId -> Room
const rooms = new Map();
// userId -> callId (fast "am I already in a call?" checks) — shared with
// the 1:1 call module through callState so either can block the other.
const { groupCallsByUser: userRooms } = callState;

function isUserInGroupCall(userId) {
  return callState.isUserInGroupCall(userId);
}

function emitToUser(io, userId, event, payload) {
  io.to(userRoom(userId)).emit(event, payload);
}

// Everyone currently in the room (excluding one peer) — room events
// fan out to sockets by the user rooms they subscribed to on connect.
function getRoomPeerIds(room) {
  return Array.from(room.peers.keys());
}

// Close the room: mark the DB row, drop every participant mapping.
function closeRoom(io, room, { status = "ended" } = {}) {
  rooms.delete(room.callId);
  if (room.callId) {
    const participantIds = getRoomPeerIds(room);
    participantIds.forEach((peerId) => userRooms.delete(String(peerId)));

    callsRepo
      .markGroupCallEnded(room.callId, status)
      .catch((err) => console.error("markGroupCallEnded error:", err.message));
  }
  room.close();
}

function teardownPeer(io, room, peerId, { notify = true } = {}) {
  const wasInRoom = room.hasPeer(peerId);
  if (!wasInRoom) return;

  room.removePeer(peerId);
  userRooms.delete(String(peerId));

  callsRepo
    .markGroupCallParticipantLeft(room.callId, peerId)
    .catch((err) => console.error("markGroupCallParticipantLeft error:", err.message));

  if (notify) {
    getRoomPeerIds(room).forEach((otherPeerId) => {
      emitToUser(io, otherPeerId, "group_call:peer-left", {
        callId: room.callId,
        peerId,
      });
    });
  }

  // Last one out closes the call. A call that nobody but the initiator
  // ever joined is recorded as missed.
  if (room.peerCount === 0) {
    const otherParticipants =
      room.joinedOtherParticipants || false;
    closeRoom(io, room, { status: otherParticipants ? "ended" : "missed" });
  }
}

module.exports = (io) => {
  callsRepo.endOrphanedGroupCalls().catch((err) => {
    console.error("endOrphanedGroupCalls error:", err.message);
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user.id);

    // -------------------------------------------------------------
    // Start ringing: create the call row, the SFU room and the joiner
    // state for the caller. Every other group member who is online is
    // invited via `group_call:incoming`.
    // -------------------------------------------------------------
    socket.on("group_call:ring", async (payload, ack) => {
      const { conversationId, callType } = payload || {};
      const respond = typeof ack === "function" ? ack : () => {};

      try {
        if (
          !conversationId ||
          !["audio", "video"].includes(callType)
        ) {
          respond({ error: "conversationId and callType are required" });
          return;
        }

        const participants = await assertConversationParticipant(
          conversationId,
          userId,
        );

        if (isUserInGroupCall(userId)) {
          respond({ error: "You are already in a call" });
          return;
        }

        if (callState.isUserIn1to1Call(userId)) {
          respond({ error: "You are already in a call" });
          return;
        }

        const call = await callsRepo.createGroupCall({
          conversationId,
          initiatorId: userId,
          callType,
        });

        const room = new Room(call.id, { callType });
        room.callId = call.id;
        room.conversationId = conversationId;
        room.initiatorId = userId;
        room.joinedOtherParticipants = false;
        rooms.set(call.id, room);
        userRooms.set(userId, call.id);

        await room.addPeer(userId);

        // Invite every other member (best-effort; offline members see
        // the call in history and can rejoin later only while it runs).
        const initiator = await userRepo.findByIdWithAvatar(userId);
        for (const member of participants) {
          const memberId = String(member.user_id);
          if (memberId === userId) continue;

          if (await isUserOnline(memberId)) {
            emitToUser(io, memberId, "group_call:incoming", {
              callId: call.id,
              conversationId,
              callType,
              initiatorId: userId,
              initiatorName:
                initiator?.display_name ||
                initiator?.phone_number ||
                "Someone",
              initiatorAvatarUrl: initiator?.avatar_storage_key
                ? buildMediaUrl(initiator.avatar_storage_key)
                : null,
              participantLimit: MAX_PARTICIPANTS,
            });
          }
        }

        respond({ callId: call.id });
      } catch (err) {
        console.error("group_call:ring error:", err.message);
        respond({ error: err.message || "Failed to start the call" });
      }
    });

    // -------------------------------------------------------------
    // Join: membership check, capacity check, RTP capabilities.
    // The client then loads its Device and creates transports.
    // -------------------------------------------------------------
    socket.on("group_call:join", async ({ callId }, ack) => {
      const respond = typeof ack === "function" ? ack : () => {};

      try {
        const room = rooms.get(callId);
        if (!room || room.closed) {
          respond({ error: "Call has ended" });
          return;
        }

        const call = await callsRepo.getGroupCallById(callId);
        if (!call) {
          respond({ error: "Call not found" });
          return;
        }

        // Membership is checked against the conversation, not the
        // participant table — anyone in the group can hop in.
        const participants = await assertConversationParticipant(
          call.conversationId,
          userId,
        );
        if (!participants.length) {
          respond({ error: "Not a member of this group" });
          return;
        }

        if (room.hasPeer(userId)) {
          respond({ error: "Already joined this call" });
          return;
        }

        if (isUserInGroupCall(userId)) {
          respond({ error: "You are already in a call" });
          return;
        }

        if (callState.isUserIn1to1Call(userId)) {
          respond({ error: "You are already in a call" });
          return;
        }

        if (room.isFull()) {
          respond({
            error: `Call is full (max ${MAX_PARTICIPANTS} participants)`,
            reason: "full",
          });
          return;
        }

        const router = await room.ensureRouter();
        await room.addPeer(userId);
        userRooms.set(userId, callId);
        room.joinedOtherParticipants = true;

        await callsRepo.addGroupCallParticipant(callId, userId);

        const me = await userRepo.findByIdWithAvatar(userId);

        // Tell the room about the newcomer (they get the existing
        // producers in the join ack below).
        getRoomPeerIds(room)
          .filter((peerId) => peerId !== userId)
          .forEach((otherPeerId) => {
            emitToUser(io, otherPeerId, "group_call:peer-joined", {
              callId,
              peer: {
                peerId: userId,
                displayName:
                  me?.display_name || me?.phone_number || "Member",
                avatarUrl: me?.avatar_storage_key
                  ? buildMediaUrl(me.avatar_storage_key)
                  : null,
              },
            });
          });

        respond({
          rtpCapabilities: router.rtpCapabilities,
          self: {
            peerId: userId,
            displayName: me?.display_name || me?.phone_number || "You",
            avatarUrl: me?.avatar_storage_key
              ? buildMediaUrl(me.avatar_storage_key)
              : null,
          },
          // Producers already flowing when the joiner arrives.
          peers: room.getExistingProducers(),
        });
      } catch (err) {
        console.error("group_call:join error:", err.message);
        respond({ error: err.message || "Failed to join the call" });
      }
    });

    // -------------------------------------------------------------
    // mediasoup transport / producer / consumer plumbing
    // -------------------------------------------------------------

    socket.on(
      "group_call:create-transport",
      async ({ callId, direction }, ack) => {
        const respond = typeof ack === "function" ? ack : () => {};
        try {
          const room = rooms.get(callId);
          if (!room || room.closed || !room.hasPeer(userId)) {
            respond({ error: "Not in this call" });
            return;
          }
          if (!["send", "recv"].includes(direction)) {
            respond({ error: "direction must be 'send' or 'recv'" });
            return;
          }

          await room.ensureRouter();
          const params = await room.createWebRtcTransport(userId, direction);
          respond({ params });
        } catch (err) {
          console.error("group_call:create-transport error:", err.message);
          respond({ error: err.message || "Transport failed" });
        }
      },
    );

    socket.on(
      "group_call:connect-transport",
      async ({ callId, transportId, dtlsParameters }, ack) => {
        const respond = typeof ack === "function" ? ack : () => {};
        try {
          const room = rooms.get(callId);
          if (!room || !room.hasPeer(userId)) {
            respond({ error: "Not in this call" });
            return;
          }
          await room.connectTransport(userId, transportId, dtlsParameters);
          respond({ connected: true });
        } catch (err) {
          console.error("group_call:connect-transport error:", err.message);
          respond({ error: err.message || "Connect failed" });
        }
      },
    );

    socket.on(
      "group_call:produce",
      async ({ callId, transportId, kind, rtpParameters }, ack) => {
        const respond = typeof ack === "function" ? ack : () => {};
        try {
          const room = rooms.get(callId);
          if (!room || !room.hasPeer(userId)) {
            respond({ error: "Not in this call" });
            return;
          }

          const producer = await room.produce(
            userId,
            transportId,
            kind,
            rtpParameters,
          );

          // Tell the rest of the room a new upstream is available.
          getRoomPeerIds(room)
            .filter((peerId) => peerId !== userId)
            .forEach((otherPeerId) => {
              emitToUser(io, otherPeerId, "group_call:new-producer", {
                callId,
                peerId: userId,
                producerId: producer.id,
                kind: producer.kind,
                paused: producer.paused,
              });
            });

          respond({ producerId: producer.id });
        } catch (err) {
          console.error("group_call:produce error:", err.message);
          respond({ error: err.message || "Produce failed" });
        }
      },
    );

    socket.on(
      "group_call:consume",
      async ({ callId, transportId, producerId, rtpCapabilities }, ack) => {
        const respond = typeof ack === "function" ? ack : () => {};
        try {
          const room = rooms.get(callId);
          if (!room || !room.hasPeer(userId)) {
            respond({ error: "Not in this call" });
            return;
          }

          const { consumer, info } = await room.consume(
            userId,
            rtpCapabilities,
            producerId,
          );

          respond({ ...info, transportId: consumer.transportId ?? transportId });
        } catch (err) {
          console.error("group_call:consume error:", err.message);
          respond({ error: err.message || "Consume failed" });
        }
      },
    );

    socket.on(
      "group_call:resume-consumer",
      async ({ callId, consumerId }, ack) => {
        const respond = typeof ack === "function" ? ack : () => {};
        try {
          const room = rooms.get(callId);
          if (!room || !room.hasPeer(userId)) {
            respond({ error: "Not in this call" });
            return;
          }
          await room.resumeConsumer(userId, consumerId);
          respond({ resumed: true });
        } catch (err) {
          console.error("group_call:resume-consumer error:", err.message);
          respond({ error: err.message || "Resume failed" });
        }
      },
    );

    // Mute / camera toggles: pause or resume this user's producers and
    // mirror the state to the rest of the room so tiles update live.
    socket.on(
      "group_call:producer-state",
      async ({ callId, producerId, kind, paused }, ack) => {
        const respond = typeof ack === "function" ? ack : () => {};
        try {
          const room = rooms.get(callId);
          const peer = room?.getPeer(userId);
          const producer = peer?.producers.get(producerId);
          if (!room || !producer) {
            respond({ error: "Producer not found" });
            return;
          }

          if (paused) {
            await producer.pause();
          } else {
            await producer.resume();
          }

          getRoomPeerIds(room)
            .filter((peerId) => peerId !== userId)
            .forEach((otherPeerId) => {
              emitToUser(io, otherPeerId, "group_call:producer-state", {
                callId,
                peerId: userId,
                producerId,
                kind,
                paused: Boolean(paused),
              });
            });

          respond({ paused: Boolean(paused) });
        } catch (err) {
          console.error("group_call:producer-state error:", err.message);
          respond({ error: err.message || "Update failed" });
        }
      },
    );

    // -------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------

    // Leave (voluntary or via the end screen) — the peer's media is
    // dropped; the call keeps running for everyone still in it.
    socket.on("group_call:leave", ({ callId }) => {
      const room = rooms.get(callId);
      if (!room) return;
      if (!room.hasPeer(userId)) return;
      teardownPeer(io, room, userId);
    });

    // End for everyone: initiator-only. Everyone gets kicked out and
    // the room is closed.
    socket.on("group_call:end", async ({ callId }, ack) => {
      const respond = typeof ack === "function" ? ack : () => {};
      const room = rooms.get(callId);
      if (!room || room.closed) {
        respond({ ended: true });
        return;
      }

      const call = await callsRepo.getGroupCallById(callId);
      if (!call || String(call.initiatorId) !== userId) {
        respond({ error: "Only the call initiator can end it for everyone" });
        return;
      }

      const participantIds = getRoomPeerIds(room).filter(
        (peerId) => peerId !== userId,
      );
      participantIds.forEach((peerId) => {
        emitToUser(io, peerId, "group_call:ended", { callId });
      });

      closeRoom(io, room, { status: "ended" });
      respond({ ended: true });
    });

    // Fetch the live roster of a call (reconnects / late UI refresh).
    socket.on("group_call:participants", async ({ callId }, ack) => {
      const respond = typeof ack === "function" ? ack : () => {};
      const room = rooms.get(callId);
      if (!room || room.closed) {
        respond({ participants: [], active: false });
        return;
      }

      const ids = getRoomPeerIds(room);
      const participants = await Promise.all(
        ids.map(async (peerId) => {
          const user = await userRepo.findByIdWithAvatar(peerId);
          return {
            peerId,
            displayName:
              user?.display_name || user?.phone_number || "Member",
            avatarUrl: user?.avatar_storage_key
              ? buildMediaUrl(user.avatar_storage_key)
              : null,
          };
        }),
      );

      respond({ participants, active: true, limit: MAX_PARTICIPANTS });
    });

    // -------------------------------------------------------------
    // Socket dropped mid-call: treat exactly like hanging up.
    // -------------------------------------------------------------
    socket.on("disconnect", () => {
      const callId = userRooms.get(userId);
      if (!callId) return;
      const room = rooms.get(callId);
      if (!room) return;
      teardownPeer(io, room, userId);
    });
  });
};

module.exports.isUserInGroupCall = isUserInGroupCall;
module.exports.rooms = rooms;
