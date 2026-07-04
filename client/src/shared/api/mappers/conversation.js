import { formatChatTime } from "../../utils/formatChatTime";

export function toConversation(raw) {
  if (!raw) return null;

  const lastMessageAt =
    raw.lastMessageCreatedAt ??
    raw.last_message_created_at ??
    raw.lastMessageAt ??
    raw.last_message_at ??
    raw.createdAt ??
    raw.created_at;

  const lastMessage =
    raw.lastMessageContent ??
    raw.last_message_content ??
    raw.lastMessage ??
    raw.last_message ??
    raw.message ??
    "";

  const name =
    raw.otherUserName ??
    raw.name ??
    raw.otherUserPhone ??
    raw.phoneNumber ??
    "Chat";

  const profilePic =
    raw.otherUserAvatarUrl ??
    raw.profilePic ??
    raw.avatarUrl ??
    null;

  return {
    id: raw.id,
    chatType: raw.chatType ?? raw.chat_type,
    otherUserId: raw.otherUserId ?? raw.otheruserid,
    name,
    phoneNumber: raw.otherUserPhone ?? raw.phoneNumber ?? raw.phone_number,
    profilePic,
    avatarUrl: profilePic,
    lastMessage,
    lastMessageAt,
    message: lastMessage,
    time: formatChatTime(lastMessageAt),
  };
}
