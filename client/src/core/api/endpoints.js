const ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    VERIFY_OTP: "/auth/verify-otp",
    REFRESH_TOKEN: "/auth/refresh",
  },
  ME: {
    CHECK_ME: "/users/me",
    UPDATE_PROFILE: "/users/update-profile",
    UPLOAD_PROFILE_PIC: "/users/upload-avatar",
  },
  USERS: {
    ONBOARD_USER: "/users/onboard",
    SEARCH_USER: "/users/search",
  },
  CHAT: {
    MY_CHATS: "/chats/my-conversations",
    CREATE_FIND_CHAT: "/chats/create-find-conversation",
    GET_MESSAGES: "/chats/conversation/:conversationId/messages",
  },
};

export default ENDPOINTS;
