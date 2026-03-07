import ChatList from "../components/ChatList";
import IconSidebar from "../components/IconSidebar";

function ChatLayout({ children }) {
  return (
    <div className="flex h-screen bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
      <IconSidebar />
      <ChatList />
      {children}
    </div>
  );
}

export default ChatLayout;