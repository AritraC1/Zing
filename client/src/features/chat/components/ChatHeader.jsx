import { Phone, Video, MoreVertical, ArrowLeft } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useState } from "react";
import UserProfileDetails from "./UserProfileDetails";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useAppShell } from "../../../shared/layout/useAppShell";
import { useCall } from "../../calls/hooks/useCall";

const connectionStatus = (isOnline) =>
  isOnline
    ? { dot: "bg-emerald-500", label: "Online", text: "text-emerald-600" }
    : { dot: "bg-red-400", label: "Offline", text: "text-red-500" };

const ChatHeader = () => {
  const { selectedChat, otherUserPresence, otherUserTyping } = useChat();
  const { isMobile, closeConversation } = useAppShell();
  const { startCall } = useCall();
  const [showProfile, setShowProfile] = useState(false);

  if (!selectedChat) return null;

  const avatarUrl = selectedChat.profilePic || selectedChat.avatarUrl;
  const isTyping =
    otherUserTyping?.userId === selectedChat.otherUserId &&
    otherUserTyping?.isTyping;
  const conn = isTyping
    ? { dot: "bg-emerald-500", label: "typing…", text: "text-emerald-600" }
    : connectionStatus(otherUserPresence?.online);

  const startAudioCall = () =>
    startCall({
      conversationId: selectedChat.id,
      peerId: selectedChat.otherUserId,
      name: selectedChat.name,
      avatarUrl,
      callType: "audio",
    });

  const startVideoCall = () =>
    startCall({
      conversationId: selectedChat.id,
      peerId: selectedChat.otherUserId,
      name: selectedChat.name,
      avatarUrl,
      callType: "video",
    });

  return (
    <>
      <div className="h-16 shrink-0 bg-white border-b-2 border-gray-100 flex items-center justify-between px-3 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && (
            <button
              type="button"
              onClick={closeConversation}
              aria-label="Back to chats"
              className="-ml-1 p-1.5 rounded-full text-gray-700 hover:bg-gray-100
                active:scale-90 transition touch-manipulation shrink-0"
            >
              <ArrowLeft size={22} />
            </button>
          )}

          <div
            className="h-11 w-11 min-w-11 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-gray-200 overflow-hidden"
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

          <div className="min-w-0">
            <div className="font-bold text-m text-gray-900 leading-tight truncate">
              {selectedChat.name}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${conn.dot} ${isTyping ? "animate-pulse" : ""}`} />
              <span className={`text-[9px] font-medium tracking-wide ${conn.text}`}>
                {conn.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
          <button
            onClick={startVideoCall}
            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors active:scale-90 touch-manipulation"
          >
            <Video size={20} />
          </button>

          <button
            onClick={startAudioCall}
            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors active:scale-90 touch-manipulation"
          >
            <Phone size={20} />
          </button>

          <button
            onClick={() => setShowProfile(true)}
            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors active:scale-90 touch-manipulation"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <div
        className={`fixed top-0 right-0 h-dvh z-50 transform transition-transform duration-300
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
