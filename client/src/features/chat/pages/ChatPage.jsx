import { useEffect } from "react";
import ChatLayout from "../layout/chatLayout";
import { useChat } from "../hooks/useChat";
import ChatHeader from "../components/ChatHeader";
import Messages from "../components/Messages";
import MessageInput from "../components/MessageInput";

const ChatPage = () => {
  const { selectedChat, tab, setTab } = useChat();

  useEffect(() => {
    if (tab === "calls") {
      setTab("chats");
    }
  }, [tab, setTab]);

  // render message pane for both regular and archived tabs
  const showConversation = tab === "chats" || tab === "archive";

  return (
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
  );
};

export default ChatPage;
