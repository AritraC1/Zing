import { memo, useState } from "react";
import {
  Download,
  ChevronDown,
  Pencil,
  Trash2,
  Share2,
  Star,
  Reply,
} from "lucide-react";
import MessageStatusIcon from "./MessageStatusIcon";
import MediaViewer from "./MediaViewer";
import { REACTION_EMOJIS } from "../constants/reactions";
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

// Chevron + dropdown with the quick-reaction strip plus Reply / Edit /
// Forward / Star / Delete. `side` flips the menu alignment so it stays
// inside the viewport on both bubble sides.
const BubbleActions = ({ side, actions, emojiActions, open, onToggle }) => {
  if (!actions.length && !emojiActions?.length) return null;

  return (
    <div className="relative self-end mb-1 shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Message actions"
        className={`p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition
          opacity-100 md:opacity-0 md:group-hover/bubble:opacity-100 focus:opacity-100 ${
            open ? "md:opacity-100" : ""
          }`}
      >
        <ChevronDown size={14} />
      </button>

      {open && (
        <>
          {/* Click-away layer */}
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div
            className={`absolute bottom-full mb-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${
              side === "right" ? "right-0" : "left-0"
            }`}
          >
            {emojiActions?.length > 0 && (
              <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100">
                {emojiActions.map(({ emoji, title, onClick }) => (
                  <button
                    key={emoji}
                    type="button"
                    title={title}
                    onClick={onClick}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-base hover:bg-gray-100 active:scale-90 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {actions.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors
                  ${
                    item.danger
                      ? "text-red-500 hover:bg-red-50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Quoted message rendered above a reply (and in the composer banner).
const ReplyQuote = ({
  senderName,
  content,
  msgType,
  isDeleted,
  variant = "bubble",
}) => {
  const isOwn = variant === "own";
  const preview = isDeleted
    ? "This message was deleted"
    : content?.trim() ||
      (msgType === "media" ? "📷 Photo" : "");

  if (!preview) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-2.5 py-1.5 mb-1.5 border-l-4 max-w-full
        ${
          isOwn
            ? "bg-white/15 border-white/60 text-white/90"
            : "bg-gray-200/70 border-emerald-500 text-gray-600"
        }`}
    >
      <div className="min-w-0">
        <div
          className={`text-[11px] font-semibold truncate
            ${isOwn ? "text-white/80" : "text-emerald-600"}`}
        >
          {senderName || "Unknown"}
        </div>
        <div className="text-xs truncate">{preview}</div>
      </div>
    </div>
  );
};

// Reaction chips under a bubble. Grouped by emoji; tap toggles your own
// reaction on that emoji.
const ReactionRow = ({ reactions, currentUserId, onReact }) => {
  if (!reactions?.length) return null;

  const grouped = [];
  reactions.forEach((r) => {
    const entry = grouped.find((g) => g.emoji === r.emoji);
    if (entry) {
      entry.count += 1;
      entry.userIds.push(r.userId);
    } else {
      grouped.push({ emoji: r.emoji, count: 1, userIds: [r.userId] });
    }
  });

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {grouped.map(({ emoji, count, userIds }) => {
        const isMine = currentUserId && userIds.includes(currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact?.(emoji)}
            title={isMine ? "Remove your reaction" : "React"}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors
              ${
                isMine
                  ? "bg-emerald-50 border-emerald-400"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
          >
            <span className="text-xs leading-none">{emoji}</span>
            {count > 1 && (
              <span className="text-gray-500 font-medium">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
  status,
  sendStatus,
  onRetry,
  isGroupChat = false,
  onEdit,
  onDelete,
  onForward,
  onReply,
  onReact,
  onToggleStar,
  currentUserId,
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  if (!message?.id && !message?.client_msg_id) return null;

  const isDeleted = Boolean(message.is_deleted);
  const isEdited = Boolean(message.edited_at) && !isDeleted;
  const isForwarded = Boolean(message.forwarded_from_id);
  const isStarred = Boolean(message.starred_by_me);
  const isReply = Boolean(message.reply_to_id);
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

  // Only own, plain-text, non-deleted messages can be edited.
  const canEdit =
    isOwnMessage &&
    !isDeleted &&
    message.msg_type === "text" &&
    Boolean(message.content?.trim());

  const closeMenu = () => setMenuOpen(false);

  const actionItems = [
    ...(onReply && !isDeleted
      ? [
          {
            key: "reply",
            icon: <Reply size={13} />,
            label: "Reply",
            onClick: () => {
              closeMenu();
              onReply(message);
            },
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            key: "edit",
            icon: <Pencil size={13} />,
            label: "Edit",
            onClick: () => {
              closeMenu();
              onEdit?.(message);
            },
          },
        ]
      : []),
    ...(onForward
      ? [
          {
            key: "forward",
            icon: <Share2 size={13} />,
            label: "Forward",
            onClick: () => {
              closeMenu();
              onForward(message);
            },
          },
        ]
      : []),
    ...(onToggleStar && !isDeleted
      ? [
          {
            key: "star",
            icon: (
              <Star
                size={13}
                className={isStarred ? "fill-amber-400 text-amber-400" : ""}
              />
            ),
            label: isStarred ? "Unstar" : "Star",
            onClick: () => {
              closeMenu();
              onToggleStar(message);
            },
          },
        ]
      : []),
    ...(isOwnMessage && !isDeleted
      ? [
          {
            key: "delete",
            icon: <Trash2 size={13} />,
            label: "Delete",
            danger: true,
            onClick: () => {
              closeMenu();
              if (window.confirm("Delete this message for everyone?")) {
                onDelete?.(message);
              }
            },
          },
        ]
      : []),
  ];

  // Has any interaction beyond the menu itself? Controls whether the
  // actions chevron shows on hover-only basis.
  const hasActions = actionItems.length > 0 || Boolean(onReact);

  const emojiActions = onReact
    ? REACTION_EMOJIS.map((emoji) => ({
        emoji,
        title: isOwnMessage && message.reactions?.some(
          (r) => r.userId === currentUserId && r.emoji === emoji,
        )
          ? "Remove your reaction"
          : "React",
        onClick: () => {
          closeMenu();
          onReact(message, emoji);
        },
      }))
    : null;

  return (
    <>
      <div
        className={`group/bubble flex gap-1.5 items-start ${
          isOwnMessage ? "justify-end" : "justify-start"
        }`}
      >
        {isOwnMessage && hasActions && (
          <BubbleActions
            side="right"
            actions={actionItems}
            emojiActions={emojiActions}
            open={menuOpen}
            onToggle={() => setMenuOpen((v) => !v)}
          />
        )}

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
              isDeleted
                ? "bg-gray-100 text-gray-400 italic rounded-3xl"
                : isOwnMessage
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
            {isDeleted ? (
              <div className="flex items-center gap-1.5">
                <Trash2 size={12} />
                <span>This message was deleted</span>
              </div>
            ) : (
              <>
                {isForwarded && (
                  <div
                    className={`flex items-center gap-1 text-[10px] font-medium italic mb-1
                      ${isOwnMessage ? "text-white/70" : "text-gray-400"}`}
                  >
                    <Share2 size={10} />
                    Forwarded
                  </div>
                )}

                {isReply && (
                  <ReplyQuote
                    senderName={message.reply_sender_name}
                    content={message.reply_content}
                    msgType={message.reply_msg_type}
                    isDeleted={message.reply_is_deleted}
                    variant={isOwnMessage ? "own" : "other"}
                  />
                )}

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
              </>
            )}

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

              {isEdited && <span className="italic">edited</span>}

              {isStarred && (
                <Star size={10} className="fill-amber-400 text-amber-400" />
              )}

              {isOwnMessage && (
                <MessageStatusIcon status={status} sendStatus={sendStatus} />
              )}
            </div>
          </div>

          {!isDeleted && message.reactions?.length > 0 && (
            <ReactionRow
              reactions={message.reactions}
              currentUserId={currentUserId}
              onReact={(emoji) => onReact?.(message, emoji)}
            />
          )}

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

        {!isOwnMessage && hasActions && (
          <BubbleActions
            side="left"
            actions={actionItems}
            emojiActions={emojiActions}
            open={menuOpen}
            onToggle={() => setMenuOpen((v) => !v)}
          />
        )}
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
