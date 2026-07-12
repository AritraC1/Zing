import { Phone, Video, MoreVertical } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import UserProfileDetails from "./UserProfileDetails";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import PresenceLabel from "./PresenceLabel";
import { useSocketContext } from "../../../core/socket/useSocketContext";

const connectionStatus = (isConnected, isReconnecting) => {
  if (isReconnecting) {
    return { dot: "bg-amber-400", label: "Reconnecting…", text: "text-amber-600" };
  }
  if (isConnected) {
    return { dot: "bg-emerald-500", label: "Connected", text: "text-emerald-600" };
  }
  return { dot: "bg-red-400", label: "Offline", text: "text-red-500" };
};

const ChatHeader = () => {
  const navigate = useNavigate();
  const { selectedChat, otherUserPresence } = useChat();
  const { isConnected, isReconnecting } = useSocketContext();
  const [showProfile, setShowProfile] = useState(false);

  if (!selectedChat) return null;

  const avatarUrl = selectedChat.profilePic || selectedChat.avatarUrl;
  const conn = connectionStatus(isConnected, isReconnecting);

  const startCall = () =>
    navigate("/audio-call", { state: { chat: selectedChat } });

  const startVideoCall = () =>
    navigate("/video-call", { state: { chat: selectedChat } });

  return (
    <>
      <div className="h-16 bg-white border-b-2 border-gray-100 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
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

          <div>
            <div className="font-bold text-m text-gray-900 leading-tight">
              {selectedChat.name}
            </div>

            <PresenceLabel
              online={otherUserPresence.online}
              lastSeenAt={otherUserPresence.lastSeenAt}
            />

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${conn.dot}`} />
              <span className={`text-[9px] font-medium tracking-wide ${conn.text}`}>
                {conn.label}
              </span>
            </div>
          </div>
        </div>

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
