export function toUser(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    phoneNumber: raw.phone_number,
    displayName: raw.display_name,
    profileCompleted: raw.profile_completed ?? false,
    avatarMediaId: raw.avatar_media_id ?? null,
    lastSeenAt: raw.last_seen_at ?? null,
    createdAt: raw.created_at ?? null,
    updatedAt: raw.updated_at ?? null,
    isNewUser: raw.isNewUser,
  };
}
