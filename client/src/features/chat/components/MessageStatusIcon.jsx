const MessageStatusIcon = ({ status }) => {
  if (!status) return null;

  const isRead = status === "seen";
  const isDelivered = status === "delivered" || isRead;
  const isSent = status === "sent" || isDelivered;

  if (!isSent) return null;

  return (
    <svg
      className="inline-block ml-1"
      width="16"
      height="10"
      viewBox="0 0 18 11"
      fill="none"
    >
      {isSent && (
        <path
          d="M1 5.5L5 9.5L13 1.5"
          stroke={isRead ? "#2563eb" : "rgba(255,255,255,0.85)"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {isDelivered && (
        <path
          d="M6 5.5L10 9.5L18 1.5"
          stroke={isRead ? "#2563eb" : "rgba(255,255,255,0.85)"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

export default MessageStatusIcon;
