import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useChat } from "../hooks/useChat";
import useAuth  from "../../auth/hooks/useAuth";

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
      {messages.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400 h-full">
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages.map((message) => {
          const isOwnMessage = message.sender_id === user.id;
          
          return (
            <div key={message.id} className={`flex gap-2 ${isOwnMessage ? 'justify-end' : ''}`}>
              {!isOwnMessage && (
                <div
                  className="h-7 w-7 rounded-full text-white flex items-center justify-center text-xs shrink-0"
                  style={{ background: getAvatarGradient(String(message.sender_id)) }}
                >
                  {message.sender_name?.charAt(0) || 'U'}
                </div>
              )}

              <div className={`px-4 py-2 rounded-2xl shadow text-sm max-w-xs wrap-break-words ${
                isOwnMessage 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white'
              }`}>
                {message.content}
                <div className={`text-[10px] mt-1 ${
                  isOwnMessage 
                    ? 'text-blue-100 text-right' 
                    : 'text-gray-400'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
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
