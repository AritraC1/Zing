import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useChat } from "../hooks/useChat";
import { useCall } from "../../calls/hooks/useCall";
import PresenceLabel from "./PresenceLabel";
import MediaViewer from "./MediaViewer";
import {
  X,
  Phone,
  Video,
  BellOff,
  Bell,
  Archive,
  ArrowUpCircle,
  Ban,
  Trash2,
  Play,
  Images,
} from "lucide-react";

// Shared-media thumbnails rendered before the "+N" tile:
// 3 on the first row + 2 on the second, with all remaining
// media grouped under a single counter tile.
const MAX_SHARED_MEDIA = 5;

const UserProfileDetails = ({ chat, onClose }) => {
  const {
    archiveChat,
    unarchiveChat,
    setMuted,
    tab,
    otherUserPresence,
    messages,
    blockedUserIds,
    blockUser,
    unblockUser,
    isChatBlocked,
    deleteChat,
  } = useChat();
  const { callState, startCall } = useCall();

  const avatarUrl = chat?.profilePic || chat?.avatarUrl;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isBlocked = Boolean(
    chat?.otherUserId && blockedUserIds.includes(chat.otherUserId),
  );
  const isMuted = Boolean(chat?.isMuted ?? chat?.is_muted);

  // Calling is unavailable while blocked (server rejects it too) or
  // while already inside another call.
  const canCall = Boolean(
    chat?.otherUserId && chat?.id && !isBlocked && !isChatBlocked,
  );
  const isCallActive = callState !== "idle";

  const handleStartCall = (callType) => {
    if (!canCall) {
      toast.error("You can't call this contact.");
      return;
    }
    if (isCallActive) {
      toast.info("Finish the current call first.");
      return;
    }

    startCall({
      peerId: chat.otherUserId,
      conversationId: chat.id,
      callType,
      name: chat.name,
      avatarUrl: avatarUrl,
    });
    onClose();
  };

  const handleToggleMute = () => {
    if (!chat?.id) return;
    setMuted(chat.id, !isMuted);
    // The pane stays open so the label flips in place.
  };

  // Reset transient state when switching to a different chat.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setAvatarFailed(false);
    setViewerItem(null);
    setShowDeleteConfirm(false);
  }, [chat?.id]);

  // Dismiss confirmation popup on Escape key
  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setShowDeleteConfirm(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteConfirm]);

  const handleConfirmDelete = () => {
    if (!chat?.id) return;
    deleteChat(chat.id);
    toast.success("Chat deleted.");
    setShowDeleteConfirm(false);
    onClose();
  };

  // Shared media from this conversation — most recent first, capped at
  // MAX_SHARED_MEDIA thumbnails. `total` keeps the full count so the
  // last tile can overlay "+N" when more exist beyond the cap.
  const { items: mediaItems, total: mediaTotal } = useMemo(() => {
    const all = (messages || []).filter(
      (m) =>
        m?.secure_url &&
        (m.mime_type?.startsWith("image/") ||
          m.mime_type?.startsWith("video/")),
    );
    return {
      total: all.length,
      items: all.slice(-MAX_SHARED_MEDIA).reverse(),
    };
  }, [messages]);

  return (
    <div
      className="h-dvh flex flex-col"
      style={{
        background: "#f0f2f5",
        borderLeft: "1px solid #e5e7eb",
        width: "min(300px, 100vw)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 h-16 shrink-0"
        style={{ background: "#ffffff", borderBottom: "1px solid #f0f0f0" }}
      >
        <h2 className="font-bold text-gray-900" style={{ fontSize: 15 }}>
          Contact Info
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
        >
          <X size={18} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 flex flex-col gap-3 p-3">
        <div className="bg-white rounded-2xl px-5 py-6 flex flex-col items-center shadow-sm">
          <div
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-white font-bold shadow"
            style={{
              background:
                avatarUrl && !avatarFailed
                  ? undefined
                  : getAvatarGradient(
                      String(chat?.id || chat?.name || ""),
                    ),
              fontSize: 36,
            }}
          >
            {avatarUrl && !avatarFailed ? (
              <img
                src={avatarUrl}
                alt={chat?.name || "Profile"}
                className="w-full h-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              (chat?.name?.charAt(0) || "U").toUpperCase()
            )}
          </div>

          <h3 className="mt-4 font-bold text-gray-900" style={{ fontSize: 17 }}>
            {chat?.name || "Unknown"}
          </h3>

          {chat?.phoneNumber && (
            <p className="text-gray-400 text-sm mt-1">{chat.phoneNumber}</p>
          )}

          <PresenceLabel
            online={otherUserPresence.online}
            lastSeenAt={otherUserPresence.lastSeenAt}
            compact
          />
        </div>

        {mediaItems.length > 0 && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Images size={13} className="text-gray-400" />
                <p className="text-xs font-semibold tracking-widest text-gray-400">
                  MEDIA
                </p>
              </div>
              <span className="text-[10px] text-gray-400">
                {mediaTotal}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {mediaItems.map((item) => {
                const isVideo =
                  item.mime_type?.startsWith("video/");
                return (
                  <button
                    key={item.id || item.client_msg_id}
                    type="button"
                    onClick={() => setViewerItem(item)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-100
                      active:scale-95 transition touch-manipulation cursor-zoom-in"
                    aria-label="View shared media"
                  >
                    {isVideo ? (
                      <video
                        src={item.secure_url}
                        muted
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={item.secure_url}
                        alt="Shared media"
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {isVideo && (
                      <span
                        className="absolute inset-0 flex items-center justify-center
                          bg-black/30 text-white"
                      >
                        <Play size={18} fill="currentColor" />
                      </span>
                    )}
                  </button>
                );
              })}

              {/* All remaining media grouped under a single "+N" tile */}
              {mediaTotal - MAX_SHARED_MEDIA > 0 && (
                <div
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100
                    flex flex-col items-center justify-center gap-0.5 text-gray-500"
                >
                  <Images size={16} />
                  <span className="text-sm font-semibold text-gray-600">
                    +{mediaTotal - MAX_SHARED_MEDIA}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-widest text-gray-400 mb-4">
            ACTIONS
          </p>

          <div className="space-y-1">
            <ActionItem
              icon={<Phone size={16} />}
              label="Voice Call"
              iconBg="bg-green-100"
              iconColor="text-green-600"
              onClick={() => handleStartCall("audio")}
            />
            <ActionItem
              icon={<Video size={16} />}
              label="Video Call"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              onClick={() => handleStartCall("video")}
            />
            <ActionItem
              icon={isMuted ? <Bell size={16} /> : <BellOff size={16} />}
              label={isMuted ? "Unmute Notifications" : "Mute Notifications"}
              iconBg="bg-yellow-100"
              iconColor="text-yellow-600"
              onClick={handleToggleMute}
            />

            {tab === "chats" ? (
              <ActionItem
                icon={<Archive size={16} />}
                label="Archive Chat"
                iconBg="bg-orange-100"
                iconColor="text-orange-500"
                onClick={() => {
                  archiveChat(chat.id);
                  onClose();
                }}
              />
            ) : (
              <ActionItem
                icon={<ArrowUpCircle size={16} />}
                label="Unarchive Chat"
                iconBg="bg-teal-100"
                iconColor="text-teal-600"
                onClick={() => {
                  unarchiveChat(chat.id);
                  onClose();
                }}
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-widest text-gray-400 mb-4">
            DANGER ZONE
          </p>
          <div className="space-y-1">
            <ActionItem
              icon={<Ban size={16} />}
              label={isBlocked ? "Unblock Contact" : "Block Contact"}
              iconBg="bg-red-100"
              iconColor="text-red-500"
              labelColor="text-red-500"
              onClick={() => {
                if (!chat?.otherUserId) return;
                if (isBlocked) {
                  unblockUser(chat.otherUserId);
                } else {
                  blockUser(chat.otherUserId);
                  onClose();
                }
              }}
            />
            <ActionItem
              icon={<Trash2 size={16} />}
              label="Delete Chat"
              iconBg="bg-red-100"
              iconColor="text-red-500"
              labelColor="text-red-500"
              onClick={() => {
                if (!chat?.id) return;
                setShowDeleteConfirm(true);
              }}
            />
          </div>
        </div>
      </div>

      {viewerItem && (
        <MediaViewer
          url={viewerItem.secure_url}
          mimeType={viewerItem.mime_type}
          onClose={() => setViewerItem(null)}
        />
      )}

      {/* Delete Chat Confirmation Modal */}
      {showDeleteConfirm &&
        (typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <div
                  className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl flex flex-col gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-11 h-11 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                    <Trash2 size={22} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-gray-900 text-base">
                      Delete Chat?
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      Delete this chat from your chat list? Only you will lose it
                      — the other person keeps their copy.
                    </p>
                  </div>
                  <div className="flex gap-2.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2.5 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="flex-1 py-2.5 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null)}
    </div>
  );
};

const ActionItem = ({
  icon,
  label,
  iconBg,
  iconColor,
  labelColor,
  onClick,
}) => (
  <div
    onClick={onClick}
    className="flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition group"
  >
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
    >
      {icon}
    </div>
    <span
      className={`text-sm font-medium ${labelColor || "text-gray-700"} group-hover:text-gray-900`}
    >
      {label}
    </span>
  </div>
);

export default UserProfileDetails;
