import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Star, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useChat } from "../hooks/useChat";
import { useAppShell } from "../../../shared/layout/useAppShell";
import {
  fetchStarredMessages,
  fetchMyChats,
  fetchMessages,
} from "../api/chatThunk";
import {
  setMessages,
  setHighlightMessage,
} from "../store/chatReducer";
import { formatChatTime } from "../../../shared/utils/formatChatTime";

// Must match the server's PAGE_SIZE (50 messages per page).
const PAGE_SIZE = 50;
// Bound the history scan so a huge chat can't loop forever (500 msgs).
const MAX_PAGES = 10;

// Preview text mirrors the chat-list rules: media bubbles show a photo
// placeholder, text shows the content.
const previewText = (message) =>
  message?.content?.trim() ||
  (message?.msg_type === "media" || message?.mime_type
    ? "📷 Photo"
    : "");

const StarredMessages = () => {
  const dispatch = useDispatch();
  const { chats, archivedChats, selectChat, setTab } = useChat();
  const starredMessages = useSelector((state) => state.chat.starredMessages);
  const loading = useSelector((state) => state.chat.loading);
  const { openConversation } = useAppShell();
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    dispatch(fetchStarredMessages());
  }, [dispatch]);

  // Open the chat scrolled to (and flashing) the starred message,
  // WhatsApp-style. The starred message may sit in history beyond the
  // loaded pages, so page through the conversation until we find it
  // (bounded), then restore the store with the collected window in
  // canonical order before jumping.
  const handleOpen = async (starred) => {
    const conversationId = starred.conversation_id;
    if (!conversationId || openingId) return;

    setOpeningId(conversationId);
    try {
      const all = [...chats, ...archivedChats];
      let chat = all.find((c) => c.id === conversationId);
      if (!chat) {
        const refreshed = await dispatch(fetchMyChats()).unwrap();
        chat = (refreshed?.conversations || []).find(
          (c) => c.id === conversationId,
        );
      }
      if (!chat) {
        toast.info("That chat is no longer available");
        return;
      }

      // Page through history (server pages oldest → newest) until the
      // starred message is loaded or the conversation is exhausted.
      const collected = [];
      let found = false;
      let hasMore = false;
      let statuses;
      for (let page = 0; page < MAX_PAGES; page++) {
        const data = await dispatch(
          fetchMessages({ conversationId, offset: page * PAGE_SIZE }),
        ).unwrap();
        collected.push(...(data.messages || []));
        statuses = data.statuses;
        hasMore = Boolean(data.hasMore);
        if (collected.some((m) => m.id === starred.id)) {
          found = true;
          break;
        }
        if (!hasMore) break;
      }

      // Restore the loaded window as the conversation's canonical
      // messages (offset 0 replaces; keeps ordering consistent).
      dispatch(
        setMessages({
          conversationId,
          messages: collected,
          statuses,
          offset: 0,
          hasMore,
        }),
      );

      // Open the conversation, then point Messages at the bubble.
      selectChat(chat);
      setTab("chats");
      openConversation();

      if (found) {
        dispatch(
          setHighlightMessage({
            conversationId,
            messageId: starred.id,
          }),
        );
      } else {
        toast.info("Message is too far back in history to show");
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
