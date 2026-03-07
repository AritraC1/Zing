import { Phone, Video, Search, Info } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import UserProfileDetails from "./UserProfileDetails";

const ChatHeader = () => {
  const { selectedChat } = useChat();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  if (!selectedChat) return null;

  const startCall = () => {
    navigate("/call", { state: { chat: selectedChat } });
  };

  const startVideoCall = () => {
    navigate("/video-call", { state: { chat: selectedChat } });
  };

  return (
    <>
      <div className="h-16 bg-white border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-purple-500 text-white flex items-center justify-center">
            {selectedChat.name.charAt(0)}
          </div>

          <div>
            <div className="font-semibold text-sm">{selectedChat.name}</div>
            <div className="flex items-center gap-2 text-xs text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Online
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {/* Phone */}
          <div
            onClick={startCall}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-green-100 hover:text-green-600 cursor-pointer transition"
          >
            <Phone size={18} />
          </div>

          {/* Video */}
          <div
            onClick={startVideoCall}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition"
          >
            <Video size={18} />
          </div>

          {/* Info */}
          <div
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 cursor-pointer transition"
          >
            <Info size={18} />
          </div>

          {/* Search */}
          <div className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 cursor-pointer transition">
            <Search size={18} />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-screen transition-transform duration-300 z-50 ${
          showProfile ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <UserProfileDetails
          chat={selectedChat}
          onClose={() => setShowProfile(false)}
        />
      </div>
    </>
  );
};

export default ChatHeader;
