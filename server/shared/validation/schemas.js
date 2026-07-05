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

module.exports = {
  verifyOtpSchema,
  onboardSchema,
  createConversationSchema,
};
