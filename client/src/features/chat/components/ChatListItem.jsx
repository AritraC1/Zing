import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useChat } from "../hooks/useChat";

const ChatListItem = ({ chat }) => {
  const { selectedChat, selectChat } = useChat();

  if (!chat || !chat.id) {
    console.warn("Invalid chat object:", chat);
    return null;
  }

  const name =
    chat.name || chat.displayName || chat.phoneNumber || "Chat";

  const isSelected = selectedChat?.id === chat.id;

  return (
    <div
      onClick={() => selectChat(chat)}
      className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl cursor-pointer transition-all relative
        ${
          isSelected
            ? "bg-white shadow-sm border-l-[3.5px] border-emerald-500"
            : "border-l-[3.5px] border-transparent hover:bg-white/60"
        }`}
    >
      {/* Avatar */}
      <div
        className="h-11 w-11 min-w-11 rounded-full flex items-center justify-center font-bold text-white text-sm relative"
        style={{ background: getAvatarGradient(String(chat.id)) }}
      >
        {String(name).charAt(0).toUpperCase()}

        {/* Online dot */}
        {isSelected && (
          <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
        )}
      </div>

      {/* Text */}
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

        <div className="text-xs text-gray-400 truncate">
          {chat.message || ""}
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;