import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Star, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useChat } from "../hooks/useChat";
import { useAppShell } from "../../../shared/layout/useAppShell";
import { fetchStarredMessages, fetchMyChats } from "../api/chatThunk";
import { formatChatTime } from "../../../shared/utils/formatChatTime";

// Preview text mirrors the chat-list rules: media bubbles show a photo
// placeholder, text shows the content.
const previewText = (message) =>
  message?.content?.trim() ||
  (message?.msg_type === "media" || message?.mime_type
    ? "📷 Photo"
    : "");

const StarredMessages = () => {
  const dispatch = useDispatch();
  const { chats, archivedChats, selectChat } = useChat();
  const starredMessages = useSelector((state) => state.chat.starredMessages);
  const loading = useSelector((state) => state.chat.loading);
  const { openConversation } = useAppShell();
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    dispatch(fetchStarredMessages());
  }, [dispatch]);

  // Jump into the conversation the starred message belongs to. The chat
  // may live in the archived list too; refetch once if we can't find it.
  const handleOpen = async (starred) => {
    const conversationId = starred.conversation_id;
    if (!conversationId || openingId) return;

    const all = [...chats, ...archivedChats];
    const chat = all.find((c) => c.id === conversationId);
    if (chat) {
      selectChat(chat);
      openConversation();
      return;
    }

    setOpeningId(conversationId);
    try {
      const refreshed = await dispatch(fetchMyChats()).unwrap();
      const found = [...(refreshed?.conversations || [])].find(
        (c) => c.id === conversationId,
      );
      if (found) {
        selectChat(found);
        openConversation();
      } else {
        toast.info("That chat is no longer available");
      }
    } catch {
      toast.error("Could not open that chat. Try again.");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="w-full md:w-80 h-full md:min-h-screen flex flex-col bg-gray-100 md:border-r md:border-gray-300">
      <div className="px-4 md:px-5 pt-4 md:pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Starred</h1>
      </div>

      {loading && starredMessages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : starredMessages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 px-6 text-center">
          <p className="text-sm">
            No starred messages yet. Star messages from a chat's menu to
            find them here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pb-2">
          {starredMessages.map((message) => (
            <button
              key={`${message.conversation_id}-${message.id}`}
              type="button"
              onClick={() => handleOpen(message)}
              className="text-left px-4 py-3 hover:bg-gray-200/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {message.peer_name || "Chat"}
                </span>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {formatChatTime(message.starred_at || message.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star
                  size={11}
                  className="fill-amber-400 text-amber-400 shrink-0"
                />
                <span className="text-xs text-gray-500 truncate">
                  {message.sender_name || "Unknown"}: {previewText(message)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StarredMessages;
