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

  const isGroup = (raw.chatType ?? raw.chat_type) === "group";

  const name = isGroup
    ? raw.groupName ?? raw.group_name ?? raw.name ?? "Group"
    : raw.otherUserName ??
      raw.name ??
      raw.otherUserPhone ??
      raw.phoneNumber ??
      "Chat";

  const profilePic = isGroup
    ? raw.groupAvatarUrl ?? raw.group_avatar_url ?? raw.profilePic ?? raw.avatarUrl ?? null
    : raw.otherUserAvatarUrl ??
      raw.profilePic ??
      raw.avatarUrl ??
      null;

  return {
    id: raw.id,
    chatType: raw.chatType ?? raw.chat_type,
    otherUserId: raw.otherUserId ?? raw.otheruserid ?? null,
    name,
    phoneNumber: raw.otherUserPhone ?? raw.phoneNumber ?? raw.phone_number,
    profilePic,
    avatarUrl: profilePic,
    // Group-only fields
    groupName: name,
    myRole: raw.myRole ?? raw.my_role ?? null,
    createdBy: raw.createdBy ?? raw.created_by ?? null,
    memberCount: Array.isArray(raw.members)
      ? raw.members.length
      : raw.memberCount ?? null,
    members: Array.isArray(raw.members) ? raw.members : undefined,
    lastMessage,
    lastMessageAt,
    message: lastMessage,
    time: formatChatTime(lastMessageAt),
    unreadCount: Number(raw.unreadCount ?? raw.unread_count ?? 0),
    isArchived: Boolean(raw.isArchived ?? raw.is_archived ?? false),
    isMuted: Boolean(raw.isMuted ?? raw.is_muted ?? false),
    otherUserLastSeenAt:
      raw.otherUserLastSeenAt ?? raw.other_user_last_seen_at ?? null,
  };
}
