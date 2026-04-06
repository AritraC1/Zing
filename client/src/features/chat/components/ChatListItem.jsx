import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useChat } from "../hooks/useChat";

const ChatListItem = ({ chat }) => {
  const { selectedChat, selectChat } = useChat();

  if (!chat || !chat.id) {
    console.warn('Invalid chat object:', chat);
    return null;
  }

  const name = chat.name || chat.displayName || chat.phoneNumber || "Chat";
  
  console.log('Rendering chat:', { id: chat.id, name, hasName: !!chat.name });

  return (
    <div
      onClick={() => selectChat(chat)}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer
      hover:bg-blue-50
      ${
        selectedChat?.id === chat.id
          ? "bg-blue-50 border-l-4 border-blue-500"
          : ""
      }`}
    >
      <div
        className="h-10 w-10 rounded-full text-white flex items-center justify-center font-bold"
        style={{ background: getAvatarGradient(String(chat.id)) }}
      >
        {String(name).charAt(0).toUpperCase()}
      </div>

      <div className="flex-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium truncate">{name}</span>
          <span className="text-xs text-gray-400">{chat.time || ""}</span>
        </div>

        <div className="text-xs text-gray-500 truncate">
          {chat.message || ""}
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;