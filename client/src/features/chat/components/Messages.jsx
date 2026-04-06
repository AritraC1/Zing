import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useChat } from "../hooks/useChat";
import useAuth  from "../../auth/hooks/useAuth";

// Safe helper to get first character of sender name
const getSenderInitial = (message) => {
  if (!message) return 'U';
  const senderName = message.sender_name || message.sender_username || message.display_name || '';
  return senderName ? String(senderName).charAt(0).toUpperCase() : 'U';
};

const Messages = () => {
  const { selectedChat, messages } = useChat();
  const { user } = useAuth();

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a chat to view messages
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-10 py-6 space-y-4 bg-[#f8fafc]">
      {!messages || messages.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400 h-full">
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages.map((message) => {
          if (!message || !message.id) return null;
          
          const isOwnMessage = user?.id && message.sender_id === user.id;
          const senderInitial = getSenderInitial(message);
          const messageContent = message.content || '';
          const createdAt = message.created_at ? new Date(message.created_at) : new Date();
          
          return (
            <div key={message.id} className={`flex gap-2 ${isOwnMessage ? 'justify-end' : ''}`}>
              {!isOwnMessage && (
                <div
                  className="h-7 w-7 rounded-full text-white flex items-center justify-center text-xs shrink-0 font-bold"
                  style={{ background: getAvatarGradient(String(message.sender_id || 'unknown')) }}
                >
                  {senderInitial}
                </div>
              )}

              <div className={`px-4 py-2 rounded-2xl shadow text-sm max-w-xs wrap-break-words ${
                isOwnMessage 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white'
              }`}>
                {messageContent}
                <div className={`text-[10px] mt-1 ${
                  isOwnMessage 
                    ? 'text-blue-100 text-right' 
                    : 'text-gray-400'
                }`}>
                  {createdAt.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                  {isOwnMessage && ' ✓✓'}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default Messages;
