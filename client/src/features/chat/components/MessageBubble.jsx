import { memo } from "react";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import MessageStatusIcon from "./MessageStatusIcon";

const getSenderInitial = (message) => {
  if (!message) return "U";
  const senderName =
    message.sender_name ||
    message.sender_username ||
    message.display_name ||
    "";
  return senderName ? String(senderName).charAt(0).toUpperCase() : "U";
};

const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
  status,
}) {
  if (!message?.id) return null;

  const isImage = message.mime_type?.startsWith("image/");
  const isVideo = message.mime_type?.startsWith("video/");
  const hasAttachment = Boolean(message.secure_url || message.mime_type);
  const senderInitial = getSenderInitial(message);
  const createdAt = message.created_at
    ? new Date(message.created_at)
    : new Date();

  return (
    <div
      className={`flex gap-2 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {!isOwnMessage && (
        <div
          className="h-7 w-7 min-w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
          style={{
            background: getAvatarGradient(String(message.sender_id || "unknown")),
          }}
        >
          {senderInitial}
        </div>
      )}

      <div
        className={`max-w-xs px-3.5 py-2.5 text-sm leading-relaxed wrap-break-words shadow-sm
        ${
          isOwnMessage
            ? "bg-emerald-500 text-white rounded-3xl"
            : "bg-gray-100 text-gray-900 rounded-3xl"
        }`}
      >
        {isImage && (
          <img
            src={message.secure_url}
            alt="media"
            className="rounded-2xl mb-2 max-w-full"
          />
        )}

        {isVideo && (
          <video controls className="rounded-2xl mb-2 max-w-full">
            <source src={message.secure_url} type={message.mime_type} />
          </video>
        )}

        {!isImage && !isVideo && hasAttachment && (
          <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 mb-2">
            <a
              href={message.secure_url || "#"}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2"
            >
              Open attachment
            </a>
            <p className="text-[10px] opacity-80 mt-1">
              {message.mime_type || "file"}
            </p>
          </div>
        )}

        {message.content && <div>{message.content}</div>}

        <div
          className={`text-[10px] mt-1 flex items-center gap-1
          ${
            isOwnMessage
              ? "justify-end text-white/70"
              : "justify-start text-gray-400"
          }`}
        >
          {createdAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}

          {isOwnMessage && <MessageStatusIcon status={status} />}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
