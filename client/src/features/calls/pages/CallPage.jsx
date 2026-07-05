import { useEffect } from "react";
import IconSidebar from "../../chat/components/IconSidebar";
import CallsList from "../components/CallsList";
import { useChat } from "../../chat/hooks/useChat";

const CallPage = () => {
  const { setTab } = useChat();

  useEffect(() => {
    setTab("calls");
  }, [setTab]);

  return (
    <div className="flex h-screen bg-gray-100">
      <IconSidebar />
      <div className="flex-1 overflow-hidden">
        <CallsList />
      </div>
    </div>
  );
};

export default CallPage;
