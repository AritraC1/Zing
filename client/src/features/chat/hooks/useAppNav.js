import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, Archive, Phone, Star } from "lucide-react";
import { useChat } from "./useChat";

/**
 * Shared bottom-nav configuration for the mobile AppShell.
 * Mirrors the desktop `IconSidebar` tabs: Chats, (Archived, if any), Calls.
 * Includes the total unread count as a badge on the Chats tab.
 */
export const useAppNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { tab, chats, archivedChats, setTab } = useChat();

  const totalUnread = chats.reduce(
    (sum, chat) => sum + (chat.unreadCount || 0),
    0,
  );

  const items = [
    {
      id: "chats",
      label: "Chats",
      icon: MessageCircle,
      badge: totalUnread,
      active: pathname === "/chat" && tab === "chats",
      onClick: () => {
        setTab("chats");
        navigate("/chat");
      },
    },
  ];

  if (archivedChats?.length > 0) {
    items.push({
      id: "archive",
      label: "Archived",
      icon: Archive,
      badge: 0,
      active: pathname === "/chat" && tab === "archive",
      onClick: () => {
        setTab("archive");
        navigate("/chat");
      },
    });
  }

  items.push({
    id: "starred",
    label: "Starred",
    icon: Star,
    badge: 0,
    active: pathname === "/chat" && tab === "starred",
    onClick: () => {
      setTab("starred");
      navigate("/chat");
    },
  });

  items.push({
    id: "calls",
    label: "Calls",
    icon: Phone,
    badge: 0,
    active: pathname === "/call",
    onClick: () => navigate("/call"),
  });

  return items;
};
