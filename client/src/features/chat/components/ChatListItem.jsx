import { getAvatarGradient } from "../../../shared/utils/avatarGradient";

const ChatListItem = ({ chat, isSelected, onSelect }) => {
  if (!chat || !chat.id) {
    console.warn("Invalid chat object:", chat);
    return null;
  }

  const name =
    chat.name || chat.displayName || chat.phoneNumber || "Chat";

  const avatarUrl = chat.profilePic || chat.avatarUrl;

  return (
    <div
      onClick={() => onSelect(chat)}
      className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl cursor-pointer transition-all relative
        ${
          isSelected
            ? "bg-white shadow-sm border-l-[3.5px] border-emerald-500"
            : "border-l-[3.5px] border-transparent hover:bg-white/60"
        }`}
    >
      <div
        className="h-11 w-11 min-w-11 rounded-full flex items-center justify-center font-bold text-white text-sm relative overflow-hidden"
        style={
          avatarUrl ? undefined : { background: getAvatarGradient(String(chat.id)) }
        }
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          String(name).charAt(0).toUpperCase()
        )}

        {isSelected && (
          <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {name}
          </span>

          <span
            className={`text-[11px] ml-2 whitespace-nowrap ${
              isSelected ? "text-emerald-500" : "text-gray-400"
            }`}
          >
            {chat.time || ""}
          </span>
        </div>

        <div className="text-xs text-gray-400 truncate pr-2">
          {chat.message || chat.lastMessage || ""}
        </div>
      </div>

      {(chat.unreadCount ?? 0) > 0 && !isSelected && (
        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
        </span>
      )}
    </div>
  );
};

export default ChatListItem;
