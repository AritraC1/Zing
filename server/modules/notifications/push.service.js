const { getFirebaseAdmin, isFirebaseAdminAvailable } = require("../../core/config/firebase.config");
const PushRepository = require("./push.repository");
const ChatRepository = require("../chat/chat.repository");
const { isUserOnline } = require("../../core/sockets/presence");

const pushRepo = new PushRepository();
const chatRepo = new ChatRepository();

async function registerToken({ userId, deviceId, token, platform }) {
  if (!isFirebaseAdminAvailable()) {
    // Registration is still persisted so tokens survive a later config fix;
    // sending simply no-ops until then.
  }

  try {
    const device = await pushRepo.setDevicePushToken({
      deviceId,
      token,
      pushType: platform || "fcm",
    });

    if (!device) {
      return { registered: false, reason: "device not found" };
    }

    return { registered: true, device };
  } catch (err) {
    console.error("push registerToken error:", err.message);
    return { registered: false, reason: err.message };
  }
}

// Fan a new message out as pushes to every offline, un-muted recipient
// device. Fire-and-forget from the caller's perspective.
async function notifyNewMessage({ message, recipientIds, senderId }) {
  try {
    if (!isFirebaseAdminAvailable() || !message) return;

    const admin = getFirebaseAdmin();
    const targets = (recipientIds || []).filter(
      (id) => String(id) !== String(senderId),
    );

    for (const userId of targets) {
      try {
        // Online users get the realtime event — do not double-notify.
        if (await isUserOnline(userId)) continue;

        // Respect the per-conversation mute flag.
        if (await chatRepo.isParticipantMuted(message.conversation_id, userId)) {
          continue;
        }

        const devices = await pushRepo.getPushTargets(userId);
        if (!devices.length) continue;

        // Content-free notification: FCM (a third party) must never see
        // sender names or message content. Recipients get a generic
        // wake-up and render details only from local data.
        const notification = {
          title: "Zing",
          body: "You have a new message",
        };

        // Data payload carries opaque routing IDs only — no sender
        // name, no message preview, nothing user-authored.
        const data = {
          type: "new_message",
          conversationId: message.conversation_id,
          messageId: message.id,
          senderId: String(message.sender_id),
        };

        const res = await admin.messaging().sendEachForMulticast({
          tokens: devices.map((d) => d.push_token),
          notification,
          data,
          webpush: {
            headers: { Urgency: "high" },
          },
        });

        // FCM reports dead tokens per response — prune them so the next
        // fan-out doesn't keep hitting them.
        await pruneInvalidTokens(devices, res.responses);
      } catch (err) {
        console.error("push notifyNewMessage error:", err.message);
      }
    }
  } catch (err) {
    console.error("push notifyNewMessage error:", err.message);
  }
}

async function pruneInvalidTokens(devices, responses) {
  if (!Array.isArray(responses)) return;

  const dead = responses
    .map((response, index) => ({ response, device: devices[index] }))
    .filter(
      ({ response }) =>
        !response.success &&
        response.error?.code === "messaging/registration-token-not-registered",
    );

  await Promise.all(dead.map(({ device }) => pushRepo.clearDevicePushToken(device.id)));
}

module.exports = { registerToken, notifyNewMessage };
