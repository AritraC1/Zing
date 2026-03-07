import ChatLayout from "../layout/chatLayout";
import { useChat } from "../hooks/useChat";
import ChatHeader from "../components/ChatHeader";
import Messages from "../components/Messages";
import MessageInput from "../components/MessageInput";

export default function ChatPage() {
  const { selectedChat } = useChat();

  return (
    <ChatLayout>
      <div className="flex-1 flex flex-col">
        {!selectedChat ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            Select a chat
          </div>
        ) : (
          <>
            <ChatHeader />
            <Messages />
            <MessageInput />
          </>
        )}
      </div>
    </ChatLayout>
  );
}