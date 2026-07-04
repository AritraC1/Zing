export function toUser(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    phoneNumber: raw.phone_number ?? raw.phoneNumber,
    displayName: raw.display_name ?? raw.displayName ?? raw.name,
    profileCompleted: raw.profile_completed ?? raw.profileCompleted ?? false,
    avatarMediaId: raw.avatar_media_id ?? raw.avatarMediaId ?? null,
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? raw.avatar ?? null,
    lastSeenAt: raw.last_seen_at ?? raw.lastSeenAt ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
    isNewUser: raw.isNewUser,
  };
}
