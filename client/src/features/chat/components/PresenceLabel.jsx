const formatLastSeen = (lastSeenAt) => {
  if (!lastSeenAt) return null;
  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isToday) return `Last seen today at ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${time}`;
  }

  return `Last seen ${date.toLocaleDateString()} at ${time}`;
};

const PresenceLabel = ({ online, lastSeenAt, compact = false }) => {
  if (online) {
    return (
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        <span
          className={`font-bold text-emerald-500 tracking-wider ${
            compact ? "text-xs" : "text-[10px]"
          }`}
        >
          Online
        </span>
      </div>
    );
  }

  const lastSeenLabel = formatLastSeen(lastSeenAt);

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
      <span
        className={`font-medium text-gray-400 tracking-wide ${
          compact ? "text-xs" : "text-[10px]"
        }`}
      >
        {lastSeenLabel || "Offline"}
      </span>
    </div>
  );
};

export default PresenceLabel;
