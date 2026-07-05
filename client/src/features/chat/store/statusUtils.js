export function statusesArrayToMap(arr) {
  const map = {};
  if (!Array.isArray(arr)) return map;

  for (const entry of arr) {
    if (!entry?.message_id || !entry?.user_id) continue;
    if (!map[entry.message_id]) map[entry.message_id] = {};
    map[entry.message_id][entry.user_id] = { ...entry };
  }
  return map;
}

export function upsertStatus(convStatuses, messageId, userId, status) {
  if (!convStatuses[messageId]) convStatuses[messageId] = {};
  const existing = convStatuses[messageId][userId];
  convStatuses[messageId][userId] = existing
    ? { ...existing, msg_status: status }
    : { message_id: messageId, user_id: userId, msg_status: status };
}

export function getMessageStatus(convStatuses, messageId, userId) {
  return convStatuses?.[messageId]?.[userId]?.msg_status ?? null;
}
