const { z } = require("zod");

const verifyOtpSchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
  deviceId: z.string().uuid("deviceId must be a valid UUID"),
  deviceType: z.enum(["web", "ios", "android", "desktop"], {
    errorMap: () => ({ message: "deviceType must be web, ios, android, or desktop" }),
  }),
});

const onboardSchema = z.object({
  displayName: z.string().trim().min(1, "displayName is required").max(100),
  deviceId: z.string().uuid("deviceId must be a valid UUID"),
  deviceType: z.enum(["web", "ios", "android", "desktop"], {
    errorMap: () => ({ message: "deviceType must be web, ios, android, or desktop" }),
  }),
});

const createConversationSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

const sendMessageSchema = z.object({
  content: z.string().trim().max(4096).optional(),
  clientMsgId: z.string().uuid("clientMsgId must be a valid UUID"),
  msgType: z.enum(["text", "media"]).optional(),
  mediaId: z.string().uuid().nullish(),
  forwardedFromId: z.string().uuid().nullish(),
  replyToId: z.string().uuid().nullish(),
});

const editMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "content is required")
    .max(4096, "content must be at most 4096 characters"),
});

const archiveSchema = z.object({
  archived: z.boolean(),
});

const muteSchema = z.object({
  muted: z.boolean(),
});

const blockUserSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

// Emoji reactions: fixed palette enforced server-side too.
const reactionSchema = z.object({
  emoji: z.enum(["👍", "❤️", "😂", "😮", "😢", "🙏"], {
    errorMap: () => ({
      message: "emoji must be one of 👍 ❤️ 😂 😮 😢 🙏",
    }),
  }),
  action: z.enum(["add", "remove"]),
});

// Star/unstar a message (per-user bookmark).
const starSchema = z.object({
  starred: z.boolean(),
});

const registerTokenSchema = z.object({
  token: z.string().min(1, "token is required").max(4096),
  deviceId: z.string().uuid("deviceId must be a valid UUID"),
  platform: z.enum(["fcm", "webpush"]).optional(),
});

// ---------------------------------------------------------------
// Groups (group chats, max 10 members)
// ---------------------------------------------------------------
const MAX_GROUP_MEMBERS = 10;

const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name is required")
    .max(100, "name must be at most 100 characters"),
  memberIds: z
    .array(z.string().uuid("memberIds must be valid UUIDs"))
    .max(MAX_GROUP_MEMBERS - 1, `at most ${MAX_GROUP_MEMBERS - 1} members besides you`)
    .default([]),
});

const renameGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name is required")
    .max(100, "name must be at most 100 characters"),
});

const addGroupMembersSchema = z.object({
  memberIds: z
    .array(z.string().uuid("memberIds must be valid UUIDs"))
    .min(1, "memberIds must contain at least one id")
    .max(MAX_GROUP_MEMBERS - 1),
});

module.exports = {
  verifyOtpSchema,
  onboardSchema,
  createConversationSchema,
  sendMessageSchema,
  editMessageSchema,
  archiveSchema,
  muteSchema,
  blockUserSchema,
  reactionSchema,
  starSchema,
  registerTokenSchema,
  createGroupSchema,
  renameGroupSchema,
  addGroupMembersSchema,
};
