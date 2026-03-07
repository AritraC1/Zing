import { MessageCircle, Phone, Archive, Star, Settings } from "lucide-react";
import { useChat } from "../hooks/useChat";

const IconSidebar = () => {
  const { tab, setTab } = useChat();

  const tabs = [
    { id: "chats", icon: MessageCircle },
    { id: "archive", icon: Archive },
    { id: "calls", icon: Phone },
  ];

  return (
    <div className="w-20 bg-white border-r flex flex-col items-center py-4 justify-between">
      <div className="space-y-6 flex flex-col items-center">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`p-3 rounded-xl ${
                tab === t.id
                  ? "bg-blue-500 text-white"
                  : "text-gray-500 hover:bg-blue-50"
              }`}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      <button className="p-3 text-gray-500 hover:bg-gray-100 rounded-xl">
        <Settings size={18} />
      </button>
    </div>
  );
}

export default IconSidebar;