import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useChat } from "../hooks/useChat";
import {
  X,
  Phone,
  Video,
  BellOff,
  Archive,
  ArrowUpCircle,
  Ban,
  Trash2,
} from "lucide-react";

const UserProfileDetails = ({ chat, onClose }) => {
  const { archiveChat, unarchiveChat, tab } = useChat();

  const media = [
    "https://picsum.photos/200/200?1",
    "https://picsum.photos/200/200?2",
    "https://picsum.photos/200/200?3",
    "https://picsum.photos/200/200?4",
    "https://picsum.photos/200/200?5",
    "https://picsum.photos/200/200?6",
  ];

  return (
    <div className="h-screen bg-white border-l shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 h-16 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Contact Info</h2>

        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={22} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Profile */}
        <div className="flex flex-col items-center py-8">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-semibold shadow-lg"
            style={{
              background: getAvatarGradient(
                String(chat?.id || chat?.name || ""),
              ),
            }}
          >
            {chat?.name?.charAt(0) || "U"}
          </div>

          <h3 className="mt-4 text-xl font-semibold text-gray-800">
            {chat?.name || "Priya Rao"}
          </h3>

          <p className="text-gray-500 mt-1">+91 87654 32109</p>

          <div className="flex items-center gap-2 mt-2 text-teal-600 text-sm">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            Online
          </div>
        </div>

        {/* Actions */}
        <div className="border-t px-6 py-5">
          <p className="text-xs tracking-widest text-gray-400 mb-4">ACTIONS</p>

          <div className="space-y-4">
            <ActionItem
              icon={<Phone size={18} />}
              label="Voice Call"
              bg="bg-green-100"
            />

            <ActionItem
              icon={<Video size={18} />}
              label="Video Call"
              bg="bg-blue-100"
            />

            <ActionItem
              icon={<BellOff size={18} />}
              label="Mute Notifications"
              bg="bg-yellow-100"
            />

            {tab === "chats" ? (
              <ActionItem
                icon={<Archive size={18} />}
                label="Archive Chat"
                bg="bg-orange-100"
                onClick={() => {
                  archiveChat(chat.id);
                  onClose();
                }}
              />
            ) : (
              <ActionItem
                icon={<ArrowUpCircle size={18} />}
                label="Unarchive Chat"
                bg="bg-green-100"
                onClick={() => {
                  unarchiveChat(chat.id);
                  onClose();
                }}
              />
            )}
          </div>
        </div>

        {/* Shared Media */}
        <div className="border-t px-6 py-5">
          <p className="text-xs tracking-widest text-gray-400 mb-4">
            SHARED MEDIA
          </p>

          <div className="grid grid-cols-3 gap-3">
            {media.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="media"
                className="rounded-lg object-cover w-full h-24"
              />
            ))}
          </div>
        </div>

        {/* Danger Actions */}
        <div className="border-t px-6 py-5 space-y-4">
          <ActionItem
            icon={<Ban size={18} />}
            label="Block Contact"
            bg="bg-red-100"
            text="text-red-600"
          />

          <ActionItem
            icon={<Trash2 size={18} />}
            label="Delete Chat"
            bg="bg-red-100"
            text="text-red-600"
          />
        </div>
      </div>
    </div>
  );
};

const ActionItem = ({ icon, label, bg, text, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 cursor-pointer group"
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}
      >
        {icon}
      </div>

      <p className={`text-gray-700 group-hover:text-black ${text}`}>{label}</p>
    </div>
  );
};

export default UserProfileDetails;
