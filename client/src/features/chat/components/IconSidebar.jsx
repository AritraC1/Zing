import { MessageCircle, Phone, Archive, Settings } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useState } from "react";
import SettingsDialog from "../../profile/components/SettingsDialog";

const IconSidebar = () => {
  const { tab, setTab } = useChat();
  const [openSettings, setOpenSettings] = useState(false);

  const tabs = [
    { id: "chats", icon: MessageCircle },
    { id: "archive", icon: Archive },
    { id: "calls", icon: Phone },
  ];

  return (
    <>
      <div className="w-16 min-h-screen bg-gray-900 flex flex-col items-center py-4 justify-between">
        
        {/* Top Section */}
        <div className="flex flex-col items-center gap-6">
          
          {/* Logo */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500 mb-2">
            <span className="text-white font-bold text-sm">Z</span>
          </div>

          {/* Tabs */}
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`p-2 rounded-lg flex items-center justify-center transition-colors
                  ${
                    isActive
                      ? "text-emerald-500"
                      : "text-gray-500 hover:text-gray-400"
                  }`}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setOpenSettings(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-400 transition-colors"
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