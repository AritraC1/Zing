import { useMemo, useState } from "react";
import { X, Search, Share2, Check } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";

// Pick one or more conversations and forward a message into each.
// The actual send happens through forwardMessageTo (socket with REST
// fallback) so forwarded messages go through the normal idempotent
// send pipeline with forwardedFromId attached.
const ForwardMessageModal = ({ message, onClose, onForward }) => {
  const { chats, archivedChats } = useChat();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // All conversations are forward targets except the one the message
  // came from (forwarding back into the same chat is just a resend).
  const targetChats = useMemo(() => {
    const all = [...chats, ...archivedChats];
    return all.filter((chat) => chat.id !== message?.conversation_id);
  }, [chats, archivedChats, message?.conversation_id]);

  const filteredChats = targetChats.filter((chat) =>
    (chat.name || "").toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSelect = (chatId) => {
    setSelectedIds((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId],
    );
  };

  const handleConfirm = () => {
    const targets = targetChats.filter((chat) => selectedIds.includes(chat.id));
    targets.forEach((chat) => onForward(chat));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-emerald-600" />
            <h2 className="font-bold text-gray-900 text-sm">
              Forward message
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-sm rounded-full bg-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <p className="text-sm font-medium">No chats found</p>
              <p className="text-xs mt-1">Try a different name</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = selectedIds.includes(chat.id);
              const name = chat.name || "Chat";
              const avatarUrl = chat.profilePic || chat.avatarUrl;

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => toggleSelect(chat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors
                    ${isSelected ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                >
                  <div
                    className="h-9 w-9 min-w-9 rounded-full flex items-center justify-center font-bold text-white text-xs overflow-hidden"
                    style={
                      avatarUrl
                        ? undefined
                        : { background: getAvatarGradient(String(chat.id)) }
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
                  </div>

                  <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                    {name}
                  </span>

                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors
                      ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-gray-300"
                      }`}
                  >
                    {isSelected && <Check size={12} />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {selectedIds.length} chat{selectedIds.length === 1 ? "" : "s"}{" "}
            selected
          </span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold
              hover:bg-emerald-600 active:scale-95 transition disabled:bg-gray-300
              disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Share2 size={14} />
            Forward
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;
