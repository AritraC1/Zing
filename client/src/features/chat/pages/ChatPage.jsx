import { useEffect } from "react";
import ChatLayout from "../layout/chatLayout";
import { useChat } from "../hooks/useChat";
import { useChatSocketSync } from "../hooks/useChatSocketSync";
import { ChatSocketProvider } from "../context/ChatSocketContext";
import ChatHeader from "../components/ChatHeader";
import Messages from "../components/Messages";
import MessageInput from "../components/MessageInput";

const ChatPage = () => {
  const {
    selectedChat,
    tab,
    setTab,
    chats,
    messages,
    messagePagination,
  } = useChat();

  const socketActions = useChatSocketSync({
    selectedChat,
    chats,
    messages,
    messagePagination,
  });

  useEffect(() => {
    if (tab === "calls") {
      setTab("chats");
    }
  }, [tab, setTab]);

  const showConversation = tab === "chats" || tab === "archive";

  return (
    <ChatSocketProvider value={socketActions}>
      <ChatLayout>
        {showConversation && (
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
        )}
      </ChatLayout>
    </ChatSocketProvider>
  );
};

export default ChatPage;
