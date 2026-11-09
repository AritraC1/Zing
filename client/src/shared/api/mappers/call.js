import { formatChatTime } from "../../utils/formatChatTime";

// Map a call into the legacy shape consumed by the calls list UI:
// "missed" / "missed_video" / "outgoing" / "outgoing_video" / "incoming" /
// "incoming_video".
export function legacyCallType({ direction, status, callType }) {
  const video = callType === "video";

  if (status === "answered") {
    return direction === "outgoing"
      ? video
        ? "outgoing_video"
        : "outgoing"
      : video
        ? "incoming_video"
        : "incoming";
  }

  // rejected / cancelled by the caller still reads as an outgoing call;
  // everything else is a missed call on both sides.
  if (status === "rejected" && direction === "outgoing") {
    return video ? "outgoing_video" : "outgoing";
  }

  return video ? "missed_video" : "missed";
}

export function formatCallDuration(answeredAt, endedAt) {
  if (!answeredAt || !endedAt) return null;

  const seconds = Math.round((new Date(endedAt) - new Date(answeredAt)) / 1000);
  if (seconds <= 0) return null;

  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function toCall(raw) {
  if (!raw) return null;

  const direction =
    raw.direction ??
    (raw.isOutgoing ? "outgoing" : raw.directionIncoming ? "incoming" : "outgoing");

  const callType = raw.callType ?? (raw.call_type === "video" ? "video" : "audio");
  const status = raw.status ?? "answered";
  const startedAt = raw.startedAt ?? raw.started_at;

  // Optimistic entries pushed by CallProvider also flow through the same
  // `calls` array, so accept their flatter shape too.
  const peer = raw.peer ?? {
    id: raw.peerId,
    name: raw.name,
    avatarUrl: raw.avatarUrl,
    phone: raw.phoneNumber,
  };

  return {
    id: raw.id,
    conversationId: raw.conversationId ?? null,
    peerId: peer?.id ?? raw.peerId ?? null,
    name: peer?.name ?? "Unknown",
    avatarUrl: peer?.avatarUrl ?? null,
    callType,
    type: legacyCallType({ direction, status, callType }),
    time: formatChatTime(startedAt),
    duration: raw.duration ?? formatCallDuration(raw.answeredAt, raw.endedAt),
  };
}
