import { useEffect, useRef } from "react";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useChat } from "../hooks/useChat";
import useAuth from "../../auth/hooks/useAuth";

const getSenderInitial = (message) => {
  if (!message) return "U";
  const senderName =
    message.sender_name ||
    message.sender_username ||
    message.display_name ||
    "";
  return senderName ? String(senderName).charAt(0).toUpperCase() : "U";
};

const Messages = () => {
  const { selectedChat, messages } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth", // change to "auto" if you want instant jump
    });
  }, [messages]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-100">
        Select a chat to view messages
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 bg-white flex flex-col gap-2">
      {!messages || messages.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400 h-full">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <>
          {messages.map((message) => {
            if (!message || !message.id) return null;

            const isOwnMessage =
              user?.id && message.sender_id === user.id;

            const senderInitial = getSenderInitial(message);
            const messageContent = message.content || "";

            const createdAt = message.created_at
              ? new Date(message.created_at)
              : new Date();

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  isOwnMessage ? "justify-end" : "justify-start"
                }`}
              >
                {!isOwnMessage && (
                  <div
                    className="h-7 w-7 min-w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                    style={{
                      background: getAvatarGradient(
                        String(message.sender_id || "unknown")
                      ),
                    }}
                  >
                    {senderInitial}
                  </div>
                )}

                <div
                  className={`max-w-xs px-3.5 py-2.5 text-sm leading-relaxed wrap-break-words shadow-sm
                  ${
                    isOwnMessage
                      ? "bg-emerald-500 text-white rounded-3xl"
                      : "bg-gray-100 text-gray-900 rounded-3xl"
                  }`}
                >
                  {messageContent}

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

                    {isOwnMessage && (
                      <svg
                        className="inline-block ml-1"
                        width="16"
                        height="10"
                        viewBox="0 0 18 11"
                        fill="none"
                      >
                        <path
                          d="M1 5.5L5 9.5L13 1.5"
                          stroke="rgba(255,255,255,0.85)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 5.5L10 9.5L18 1.5"
                          stroke="rgba(255,255,255,0.85)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default Messages;