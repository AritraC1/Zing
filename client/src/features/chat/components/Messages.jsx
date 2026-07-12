import { useEffect, useRef } from "react";
import { useChat } from "../hooks/useChat";
import { useChatSocket } from "../context/ChatSocketContext";
import useAuth from "../../auth/hooks/useAuth";
import MessageBubble from "./MessageBubble";
import { groupMessagesByDate } from "../../../shared/utils/dateSeparators";

const Messages = () => {
  const {
    selectedChat,
    messages,
    getStatusForMessage,
    messagePagination,
  } = useChat();
  const { markAsRead, loadOlderMessages, retryMessage } = useChatSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const shouldStickToBottomRef = useRef(true);

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
      className="flex-1 overflow-y-auto px-8 py-6 bg-white flex flex-col gap-2"
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
                onRetry={
                  isOwnMessage && message.sendStatus === "failed"
                    ? () =>
                        retryMessage(
                          message.client_msg_id,
                          message.conversation_id,
                        )
                    : undefined
                }
              />
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default Messages;
