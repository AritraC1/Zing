import { useMemo, useState } from "react";
import ArchivedChats from "../components/ArchivedChats";
import ChatList from "../components/ChatList";
import IconSidebar from "../components/IconSidebar";
import { useChat } from "../hooks/useChat";
import { useAppNav } from "../hooks/useAppNav";
import { useMediaQuery } from "../../../shared/hooks/useMediaQuery";
import { AppShellContext } from "../../../shared/layout/AppShellContext";
import AppShell from "../../../shared/layout/AppShell";
import SlideOverPane from "../../../shared/components/SlideOverPane";

const ChatLayout = ({ children }) => {
  const { tab, selectedChat } = useChat();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const nav = useAppNav();

  /**
   * Mobile: the conversation lives in a slide-over pane on top of the chat
   * list. Entry points (chat list, archived list, new-chat popup) call
   * `openConversation()` when a chat is picked; the pane's back button and
   * its edge-swipe gesture call `closeConversation()`. The selected chat is
   * intentionally kept in Redux so the pane animates out with full content.
   */
  const [convoOpen, setConvoOpen] = useState(false);

  const openConversation = () => setConvoOpen(true);
  const closeConversation = () => setConvoOpen(false);

  const shellValue = useMemo(
    () => ({
      isMobile: !isDesktop,
      isConversationOpen: convoOpen,
      openConversation,
      closeConversation,
    }),
    [isDesktop, convoOpen],
  );

  if (isDesktop) {
    return (
      <AppShellContext.Provider value={shellValue}>
        <div className="flex h-screen bg-gray-100">
          <IconSidebar />

          {tab === "chats" && <ChatList />}
          {tab === "archive" && <ArchivedChats />}

          {children}
        </div>
      </AppShellContext.Provider>
    );
  }

  return (
    <AppShellContext.Provider value={shellValue}>
      <AppShell nav={nav} hideChrome={convoOpen && !!selectedChat}>
        {/* List layer (Chats / Archived) */}
        <div className="absolute inset-0 bg-gray-100">
          {tab === "chats" && <ChatList />}
          {tab === "archive" && <ArchivedChats />}
        </div>

        {/* Conversation slide-over */}
        {selectedChat && (
          <SlideOverPane open={convoOpen} onClose={closeConversation}>
            {children}
          </SlideOverPane>
        )}
      </AppShell>
    </AppShellContext.Provider>
  );
};

export default ChatLayout;
