import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useSelector } from "react-redux";
import { BellOff, Users } from "lucide-react";

const ChatListItem = ({ chat, isSelected, onSelect }) => {
  // Presence straight from the Redux store so the list dot always
  // matches what the profile pane shows (same source of truth).
  // Hooks run unconditionally; the invalid-chat guard lives below them.
  const isOnline = useSelector(
    (state) => Boolean(state.chat.presence.online[chat?.otherUserId]),
  );

  // "typing…" preview in the chat list, WhatsApp-style.
  const typingEntry = useSelector(
    (state) => state.chat.typing[chat?.id] || null,
  );

  if (!chat || !chat.id) {
    console.warn("Invalid chat object:", chat);
    return null;
  }

  const isGroup = chat.chatType === "group";

  const name =
    chat.name || chat.groupName || chat.displayName || chat.phoneNumber || "Chat";

  const avatarUrl = chat.profilePic || chat.avatarUrl;

  const isTyping = isGroup
    ? Boolean(typingEntry?.isTyping)
    : Boolean(
        typingEntry?.isTyping && typingEntry?.userId === chat.otherUserId,
      );

  const hasUnread = (chat.unreadCount ?? 0) > 0;
  const isMuted = Boolean(chat.isMuted ?? chat.is_muted);

  return (
    <div
      onClick={() => onSelect(chat)}
      className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl cursor-pointer transition-all relative touch-manipulation
        ${
          isSelected
            ? "bg-white shadow-sm border-l-[3.5px] border-emerald-500"
            : "border-l-[3.5px] border-transparent hover:bg-white/60 active:bg-white/90"
        }`}
    >
      <div
        className="h-11 w-11 min-w-11 rounded-full flex items-center justify-center font-bold text-white text-sm relative overflow-visible"
        style={
          avatarUrl
            ? undefined
            : { background: getAvatarGradient(String(chat.id)) }
        }
      >
        <span className="h-11 w-11 min-w-11 rounded-full overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : isGroup ? (
            <Users size={20} className="text-white" />
          ) : (
            String(name).charAt(0).toUpperCase()
          )}
        </span>

        {/* WhatsApp-style presence: green dot when the receiver is online.
            Falls back to the small selection dot when no one is online. */}
        {isOnline ? (
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 ${
              isSelected ? "border-white" : "border-gray-100"
            }`}
          />
        ) : (
          isSelected && (
            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          )
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="font-semibold text-sm text-gray-900 truncate flex items-center gap-1.5">
            {isGroup && (
              <Users size={13} className="text-gray-400 shrink-0" />
            )}
            <span className="truncate">{name}</span>
          </span>

          {/* Latest-message time: green when unread/selected, gray
              otherwise — same behaviour as WhatsApp. */}
          <span
            className={`text-[11px] ml-2 whitespace-nowrap ${
              hasUnread || isSelected
                ? "text-emerald-500 font-medium"
                : "text-gray-400"
            }`}
          >
            {chat.time || ""}
          </span>
        </div>

        <div className="text-xs text-gray-400 truncate pr-2">
          {isTyping ? (
            <span className="text-emerald-500 font-medium italic">
              typing…
            </span>
          ) : (
            (chat.message ||
              chat.lastMessage ||
              (isGroup && chat.memberCount ? `${chat.memberCount} members` : "") ||
              "")
          )}
        </div>
      </div>

      {hasUnread && !isSelected && (
        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
        </span>
      )}

      {/* Muted conversations swap the badge for a small bell — WhatsApp
          keeps counting silently instead of shouting. */}
      {isMuted && (
        <BellOff size={14} className="shrink-0 text-gray-400" />
      )}
    </div>
  );
};

export default ChatListItem;
