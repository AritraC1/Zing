export function getDateSeparatorLabel(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today - messageDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function groupMessagesByDate(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const groups = [];
  let currentLabel = null;

  for (const message of messages) {
    const label = getDateSeparatorLabel(message.created_at);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ type: "separator", label, key: `sep-${label}-${message.id}` });
    }
    groups.push({ type: "message", message, key: message.id });
  }

  return groups;
}
