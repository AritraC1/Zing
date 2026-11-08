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
});

module.exports = {
  verifyOtpSchema,
  onboardSchema,
  createConversationSchema,
  sendMessageSchema,
};
