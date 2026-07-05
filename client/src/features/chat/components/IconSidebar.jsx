import { MessageCircle, Phone, Archive, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useChat } from "../hooks/useChat";
import { useState } from "react";
import SettingsDialog from "../../profile/components/SettingsDialog";

const IconSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tab, setTab, archivedChats } = useChat();
  const [openSettings, setOpenSettings] = useState(false);

  const handleTabClick = (tabId) => {
    if (tabId === "calls") {
      navigate("/call");
      return;
    }

    setTab(tabId);
    navigate("/chat");
  };

  const tabs = [{ id: "chats", icon: MessageCircle }];

  if (archivedChats?.length > 0) {
    tabs.push({ id: "archive", icon: Archive });
  }

  tabs.push({ id: "calls", icon: Phone });

  return (
    <>
      <div className="w-16 min-h-screen bg-[#0d1117] flex flex-col items-center py-4 justify-between">
        {/* Top: Logo + Nav Icons */}
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="w-9 h-9 rounded-lg bg-[#00c896] flex items-center justify-center mb-2">
            <span className="text-white font-bold text-base leading-none">
              Z
            </span>
          </div>

          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive =
              t.id === "calls"
                ? location.pathname === "/call"
                : location.pathname === "/chat" && tab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
                className={`
                  p-2 rounded-lg flex items-center justify-center transition-colors
                  ${isActive ? "text-[#00c896]" : "text-gray-500 hover:text-gray-400"}
                `}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>

        {/* Bottom: Settings + Avatar */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setOpenSettings(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-400 transition-colors flex items-center justify-center"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      <SettingsDialog
        open={openSettings}
        onClose={() => setOpenSettings(false)}
      />
    </>
  );
};

export default IconSidebar;
