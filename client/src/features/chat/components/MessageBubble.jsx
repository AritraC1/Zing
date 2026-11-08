import { memo, useState } from "react";
import { Download } from "lucide-react";
import MessageStatusIcon from "./MessageStatusIcon";
import MediaViewer from "./MediaViewer";
import {
  downloadMedia,
  mediaFileName,
} from "../../../shared/utils/downloadMedia";

const SENDER_NAME_COLORS = [
  "#e17055",
  "#00a884",
  "#53bdeb",
  "#f5a623",
  "#7f66ff",
  "#e542a3",
  "#36cfc9",
  "#f5222d",
];

// WhatsApp-style sender-color: stable per sender so a given person
// always gets the same name color within a conversation.
const getSenderNameColor = (senderId) => {
  if (!senderId) return SENDER_NAME_COLORS[0];
  let hash = 0;
  const key = String(senderId);
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return SENDER_NAME_COLORS[Math.abs(hash) % SENDER_NAME_COLORS.length];
};

const getSenderName = (message) => {
  if (!message) return "";
  const senderName =
    message.sender_name ||
    message.sender_username ||
    message.display_name ||
    "";
  return senderName ? String(senderName).trim() : "";
};

const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
  status,
  sendStatus,
  onRetry,
  isGroupChat = false,
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  if (!message?.id && !message?.client_msg_id) return null;

  const isImage = message.mime_type?.startsWith("image/");
  const isVideo = message.mime_type?.startsWith("video/");
  const hasAttachment = Boolean(message.secure_url || message.mime_type);
  const senderName = getSenderName(message);
  // WhatsApp shows the sender name above the bubble in group chats only.
  const showSenderName = !isOwnMessage && isGroupChat && Boolean(senderName);
  const createdAt = message.created_at
    ? new Date(message.created_at)
    : new Date();
  const isFailed = sendStatus === "failed";
  const isSending = sendStatus === "sending";

  const mediaUrl = message.secure_url;

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadMedia(mediaUrl, {
      mimeType: message.mime_type,
      filename: mediaFileName(message.mime_type),
    });
  };

  return (
    <>
      <div
        className={`flex gap-2 ${
          isOwnMessage ? "justify-end" : "justify-start"
        }`}
      >
      <div className="flex flex-col items-end gap-1 max-w-xs">
        {showSenderName && (
          <span
            className="text-[12px] font-semibold px-3.5"
            style={{ color: getSenderNameColor(message.sender_id) }}
          >
            {senderName}
          </span>
        )}
        <div
          className={`w-full px-3.5 py-2.5 text-sm leading-relaxed wrap-break-words shadow-sm
          ${
            isOwnMessage
              ? `text-white rounded-3xl ${
                  isFailed
                    ? "bg-red-400"
                    : isSending
                      ? "bg-emerald-400 opacity-80"
                      : "bg-emerald-500"
                }`
              : "bg-gray-100 text-gray-900 rounded-3xl"
          }`}
        >
          {isImage && mediaUrl && (
            <div
              className="relative rounded-2xl overflow-hidden mb-2 group"
              onClick={() => setViewerOpen(true)}
            >
              <img
                src={mediaUrl}
                alt="media"
                className="max-h-52 max-w-[190px] sm:max-h-80 sm:max-w-full object-cover cursor-zoom-in rounded-2xl"
              />

              <button
                onClick={handleDownload}
                title="Download"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-opacity cursor-pointer"
              >
                <Download size={14} />
              </button>
            </div>
          )}

          {isVideo && mediaUrl && (
            <video
              controls
              className="rounded-2xl mb-2 max-h-52 max-w-[190px] sm:max-h-80 sm:max-w-full"
            >
              <source src={mediaUrl} type={message.mime_type} />
            </video>
          )}

          {!isImage && !isVideo && hasAttachment && (
            <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 mb-2">
              <a
                href={mediaUrl || "#"}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  downloadMedia(mediaUrl, {
                    mimeType: message.mime_type,
                    filename: mediaFileName(message.mime_type),
                  });
                }}
                className="font-medium underline underline-offset-2"
              >
                Download attachment
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

            {isOwnMessage && (
              <MessageStatusIcon status={status} sendStatus={sendStatus} />
            )}
          </div>
        </div>

        {isOwnMessage && isFailed && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-[10px] font-medium text-red-500 hover:text-red-600 px-1"
          >
            Tap to retry
          </button>
        )}
      </div>
      </div>

      {viewerOpen && isImage && (
        <MediaViewer
          url={mediaUrl}
          mimeType={message.mime_type}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
});

export default MessageBubble;
