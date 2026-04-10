import CallsList from "../../calls/components/CallsList";
import ArchivedChats from "../components/ArchivedChats";
import ChatList from "../components/ChatList";
import IconSidebar from "../components/IconSidebar";
import { useChat } from "../hooks/useChat";

const ChatLayout = ({ children }) => {
  const { tab } = useChat();

  if (tab === "calls") {
    return (
      <div className="flex h-screen bg-gray-100">
        <IconSidebar />
        <div className="flex-1 overflow-hidden">
          <CallsList />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <IconSidebar />

      {tab === "chats" && <ChatList />}
      {tab === "archive" && <ArchivedChats />}

      {children}
    </div>
  );
};

export default ChatLayout;