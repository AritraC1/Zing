import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useChat } from "../hooks/useChat";
import { useChatSocket } from "../context/ChatSocketContext";
import useAuth from "../../auth/hooks/useAuth";
import MessageBubble from "./MessageBubble";
import ForwardMessageModal from "./ForwardMessageModal";
import { groupMessagesByDate } from "../../../shared/utils/dateSeparators";
import { clearHighlightMessage } from "../store/chatReducer";

const Messages = () => {
  const dispatch = useDispatch();
  const {
    selectedChat,
    messages,
    getStatusForMessage,
    messagePagination,
  } = useChat();
  const highlightMessage = useSelector(
    (state) => state.chat.highlightMessage,
  );
  const {
    markAsRead,
    loadOlderMessages,
    retryMessage,
    startEdit,
    deleteMessage,
    forwardMessageTo,
    startReply,
    reactToMessage,
    toggleStar,
  } = useChatSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const shouldStickToBottomRef = useRef(true);
  const [forwardingMessage, setForwardingMessage] = useState(null);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    const sentinel = messagesEndRef.current;
    if (!container || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          markAsRead();
        }
      },
      { root: container, threshold: 0.5 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [markAsRead, selectedChat?.id, messages.length]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;

    if (container.scrollTop < 80 && messagePagination.hasMore) {
      prevScrollHeightRef.current = container.scrollHeight;
      loadOlderMessages();
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !messagePagination.loadingOlder) return;

    const heightDiff = container.scrollHeight - prevScrollHeightRef.current;
    if (heightDiff > 0) {
      container.scrollTop = heightDiff;
    }
  }, [messages.length, messagePagination.loadingOlder]);

  // Jump-to-message (opened from the starred list): scroll the target
  // bubble into view and flash it, then clear the highlight. The short
  // delay lets the conversation render first (and the mobile slide-over
  // start opening) before we measure positions.
  useEffect(() => {
    if (!highlightMessage?.messageId) return;
    if (highlightMessage.conversationId !== selectedChat?.id) return;

    const scrollTimer = setTimeout(() => {
      const el = document.querySelector(
        `[data-message-id="${highlightMessage.messageId}"]`,
      );
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);

    const clearTimer = setTimeout(() => {
      dispatch(clearHighlightMessage());
    }, 2800);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightMessage, selectedChat?.id, dispatch]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-100">
        Select a chat to view messages
      </div>
    );
  }

  const groupedItems = groupMessagesByDate(messages);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-8 py-4 sm:py-6 bg-white flex flex-col gap-2"
    >
      {!messages || messages.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400 h-full">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <>
          {messagePagination.loadingOlder && (
            <div className="text-center text-xs text-gray-400 py-2">
              Loading older messages…
            </div>
          )}

          {!messagePagination.hasMore && !messagePagination.loadingOlder && (
            <div className="text-center text-xs text-gray-300 py-2">
              Beginning of conversation
            </div>
          )}

          {groupedItems.map((item) => {
            if (item.type === "separator") {
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-center my-2"
                >
                  <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {item.label}
                  </span>
                </div>
              );
            }

            const message = item.message;
            const isOwnMessage = user?.id && message.sender_id === user.id;

            const deliveryStatus =
              isOwnMessage && message.sendStatus === "sent"
                ? getStatusForMessage(message)
                : isOwnMessage && !message.sendStatus
                  ? getStatusForMessage(message)
                  : null;

            return (
              <MessageBubble
                key={item.key}
                message={message}
                isOwnMessage={isOwnMessage}
                status={deliveryStatus}
                sendStatus={isOwnMessage ? message.sendStatus : undefined}
                isGroupChat={selectedChat?.chatType === "group"}
                onRetry={
                  isOwnMessage && message.sendStatus === "failed"
                    ? () =>
                        retryMessage(
                          message.client_msg_id,
                          message.conversation_id,
                        )
                    : undefined
                }
                onEdit={startEdit}
                onDelete={deleteMessage}
                onForward={setForwardingMessage}
                onReply={startReply}
                onReact={reactToMessage}
                onToggleStar={toggleStar}
                currentUserId={user?.id}
                isHighlighted={highlightMessage?.messageId === message.id}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}

      {forwardingMessage && (
        <ForwardMessageModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          onForward={(targetChat) => {
            forwardMessageTo(targetChat.id, forwardingMessage);
            toast.success(`Forwarded to ${targetChat.name || "chat"}`);
          }}
        />
      )}
    </div>
  );
};

export default Messages;
