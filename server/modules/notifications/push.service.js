// Push notification service (FCM via Firebase Admin).
//
// Wakes devices that are not currently connected over Socket.IO. Every
// path here is best-effort: a push failure must never affect message
// delivery, so all public methods swallow their own errors.
//
// Suppression rules (WhatsApp-style):
//   - recipients with a connected socket are skipped (they will get the
//     realtime event);
//   - recipients who muted the conversation are skipped;
//   - the sender's own devices are never notified about their own message.

const { getFirebaseAdmin, isFirebaseAdminAvailable } = require("../../core/config/firebase.config");
const PushRepository = require("./push.repository");
const ChatRepository = require("../chat/chat.repository");
const UserRepository = require("../users/users.repository");
const { isUserOnline } = require("../../core/sockets/presence");

const pushRepo = new PushRepository();
const chatRepo = new ChatRepository();
const userRepo = new UserRepository();

// Trim the preview so notification payloads stay small.
const previewText = (message) => {
  if (!message) return "";
  if (message.is_deleted) return "";
  if (message.msg_type === "media") return "📷 Photo";
  return (message.content || "").slice(0, 200);
};

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

        const senderName =
          message.sender_name || (await findSenderName(message)) || "New message";

        const notification = {
          title: senderName,
          body: previewText(message) || "New message",
        };

        // Data payload is intentionally minimal — no message content —
        // so the notification can be rendered even by a background
        // service worker without exposing plaintext to the OS.
        const data = {
          type: "new_message",
          conversationId: message.conversation_id,
          messageId: message.id,
          senderName,
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

async function findSenderName(message) {
  try {
    const user = await userRepo.findByIdWithAvatar(message.sender_id);
    return user?.display_name || null;
  } catch {
    return null;
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
