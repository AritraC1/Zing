import { Phone, Video, MoreVertical } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import UserProfileDetails from "./UserProfileDetails";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";

const ChatHeader = () => {
  const { selectedChat } = useChat();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  if (!selectedChat) return null;

  const avatarUrl = selectedChat.profilePic || selectedChat.avatarUrl;

  const startCall = () => navigate("/call", { state: { chat: selectedChat } });

  const startVideoCall = () =>
    navigate("/video-call", { state: { chat: selectedChat } });

  return (
    <>
      <div className="h-16 bg-white border-b-2 border-gray-100 flex items-center justify-between px-6">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-gray-200 overflow-hidden"
            style={
              avatarUrl
                ? undefined
                : { background: getAvatarGradient(String(selectedChat.id)) }
            }
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={selectedChat.name}
                className="w-full h-full object-cover"
              />
            ) : (
              selectedChat.name.charAt(0)
            )}
          </div>

          {/* Name + Status */}
          <div>
            <div className="font-bold text-m text-gray-900 leading-tight">
              {selectedChat.name}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[10px] font-bold text-emerald-500 tracking-wider">
                ACTIVE NOW
              </span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1">
          <button
            onClick={startVideoCall}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Video size={20} />
          </button>

          <button
            onClick={startCall}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Phone size={20} />
          </button>

          <button
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Profile Sidebar */}
      <div
        className={`fixed top-0 right-0 h-screen z-50 transform transition-transform duration-300
          ${showProfile ? "translate-x-0" : "translate-x-full"}`}
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
