import CallsList from "../../calls/components/CallsList";
import ArchivedChats from "../components/ArchivedChats";
import ChatList from "../components/ChatList";
import IconSidebar from "../components/IconSidebar";
import { useChat } from "../hooks/useChat";

const ChatLayout = ({ children }) => {
  const { tab } = useChat();

  return (
    <div className="flex h-screen bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
      <IconSidebar />

      {tab === "chats" && <ChatList />}

      {tab === "archive" && <ArchivedChats />}

      {tab === "calls" && <CallsList />}

      {children}
    </div>
  );
};

export default ChatLayout;