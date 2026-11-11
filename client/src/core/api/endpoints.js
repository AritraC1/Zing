const ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    VERIFY_OTP: "/auth/verify-otp",
    REFRESH_TOKEN: "/auth/refresh",
    LOGOUT: "/auth/logout",
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
    SEND_MESSAGE: "/chats/conversation/:conversationId/messages",
    EDIT_MESSAGE: "/chats/conversation/:conversationId/messages/:messageId",
    DELETE_MESSAGE: "/chats/conversation/:conversationId/messages/:messageId",
    REACTION: "/chats/conversation/:conversationId/messages/:messageId/reaction",
    STAR: "/chats/conversation/:conversationId/messages/:messageId/star",
    STARRED: "/chats/starred-messages",
    ARCHIVE: "/chats/conversation/:conversationId/archive",
  },
  CALLS: {
    HISTORY: "/calls/history",
  },
  MEDIA: {
    UPLOAD_MEDIA: "/media/upload",
  },
  BLOCKS: {
    BLOCK: "/blocks/block",
    UNBLOCK: "/blocks/unblock",
    LIST: "/blocks/blocked",
  },
};

export default ENDPOINTS;
