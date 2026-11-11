import { Phone, Video, MoreVertical, ArrowLeft, Users } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useState } from "react";
import UserProfileDetails from "./UserProfileDetails";
import GroupInfoPane from "./GroupInfoPane";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useAppShell } from "../../../shared/layout/useAppShell";
import { useCall } from "../../calls/hooks/useCall";
import { useGroupCall } from "../../calls/hooks/useGroupCall";

const ChatHeader = () => {
  const { selectedChat, otherUserPresence, otherUserTyping } = useChat();
  const { isMobile, closeConversation } = useAppShell();
  const { startCall } = useCall();
  const { startGroupCall } = useGroupCall();
  const [showProfile, setShowProfile] = useState(false);

  if (!selectedChat) return null;

  const isGroup = selectedChat.chatType === "group";
  const avatarUrl = selectedChat.profilePic || selectedChat.avatarUrl;
  const isTyping =
    isGroup
      ? Boolean(otherUserTyping?.isTyping)
      : otherUserTyping?.userId === selectedChat.otherUserId &&
        otherUserTyping?.isTyping;

  // Direct chats show presence; groups show the member count.
  const subtitle = isGroup
    ? isTyping
      ? "typing…"
      : `${selectedChat.memberCount || selectedChat.members?.length || ""}${
          selectedChat.memberCount || selectedChat.members?.length ? " members" : "Group"
        }`
    : isTyping
      ? "typing…"
      : otherUserPresence?.online
        ? "Online"
        : "Offline";

  const startAudioCall = () => {
    if (isGroup) {
      startGroupCall({
        conversationId: selectedChat.id,
        name: selectedChat.name,
        callType: "audio",
      });
      return;
    }
    startCall({
      conversationId: selectedChat.id,
      peerId: selectedChat.otherUserId,
      name: selectedChat.name,
      avatarUrl,
      callType: "audio",
    });
  };

  const startVideoCall = () => {
    if (isGroup) {
      startGroupCall({
        conversationId: selectedChat.id,
        name: selectedChat.name,
        callType: "video",
      });
      return;
    }
    startCall({
      conversationId: selectedChat.id,
      peerId: selectedChat.otherUserId,
      name: selectedChat.name,
      avatarUrl,
      callType: "video",
    });
  };

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
            ) : isGroup ? (
              <Users size={20} />
            ) : (
              selectedChat.name.charAt(0)
            )}
          </div>

          <div className="min-w-0">
            <div className="font-bold text-m text-gray-900 leading-tight truncate">
              {selectedChat.name}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isTyping
                    ? "bg-emerald-500 animate-pulse"
                    : isGroup
                      ? "bg-gray-300"
                      : otherUserPresence?.online
                        ? "bg-emerald-500"
                        : "bg-red-400"
                }`}
              />
              <span
                className={`text-[9px] font-medium tracking-wide ${
                  isTyping
                    ? "text-emerald-600"
                    : isGroup
                      ? "text-gray-400"
                      : otherUserPresence?.online
                        ? "text-emerald-600"
                        : "text-red-500"
                }`}
              >
                {subtitle}
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
        {isGroup ? (
          <GroupInfoPane chat={selectedChat} onClose={() => setShowProfile(false)} />
        ) : (
          <UserProfileDetails
            chat={selectedChat}
            onClose={() => setShowProfile(false)}
          />
        )}
      </div>
    </>
  );
};

export default ChatHeader;
