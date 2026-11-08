import { useEffect } from "react";
import IconSidebar from "../../chat/components/IconSidebar";
import CallsList from "../components/CallsList";
import { useChat } from "../../chat/hooks/useChat";
import { useAppNav } from "../../chat/hooks/useAppNav";
import { useMediaQuery } from "../../../shared/hooks/useMediaQuery";
import { AppShellContext } from "../../../shared/layout/AppShellContext";
import AppShell from "../../../shared/layout/AppShell";

const CallPage = () => {
  const { setTab } = useChat();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const nav = useAppNav();

  useEffect(() => {
    setTab("calls");
  }, [setTab]);

  if (!isDesktop) {
    return (
      <AppShellContext.Provider
        value={{
          isMobile: true,
          isConversationOpen: false,
          openConversation: () => {},
          closeConversation: () => {},
        }}
      >
        <AppShell nav={nav}>
          <CallsList />
        </AppShell>
      </AppShellContext.Provider>
    );
  }

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
