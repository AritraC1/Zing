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
    <div
      className="h-screen flex flex-col"
      style={{
        width: 300,
        background: "#f0f2f5",
        borderLeft: "1px solid #e5e7eb",
      }}
    >
      {/* Header */}
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
        {/* Profile Card */}
        <div className="bg-white rounded-2xl px-5 py-6 flex flex-col items-center shadow-sm">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold shadow"
            style={{
              background: getAvatarGradient(
                String(chat?.id || chat?.name || ""),
              ),
              fontSize: 36,
            }}
          >
            {chat?.name?.charAt(0) || "U"}
          </div>

          <h3 className="mt-4 font-bold text-gray-900" style={{ fontSize: 17 }}>
            {chat?.name || "Unknown"}
          </h3>

          <p className="text-gray-400 text-sm mt-1">+91 87654 32109</p>

          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
            <span
              className="text-xs font-semibold"
              style={{ color: "#00c896" }}
            >
              ACTIVE NOW
            </span>
          </div>
        </div>

        {/* Actions Card */}
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
            />
            <ActionItem
              icon={<Video size={16} />}
              label="Video Call"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <ActionItem
              icon={<BellOff size={16} />}
              label="Mute Notifications"
              iconBg="bg-yellow-100"
              iconColor="text-yellow-600"
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

        {/* Shared Media Card */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-widest text-gray-400 mb-4">
            SHARED MEDIA
          </p>
          <div className="grid grid-cols-3 gap-2">
            {media.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="media"
                className="rounded-xl object-cover w-full h-20"
              />
            ))}
          </div>
        </div>

        {/* Danger Card */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-widest text-gray-400 mb-4">
            DANGER ZONE
          </p>
          <div className="space-y-1">
            <ActionItem
              icon={<Ban size={16} />}
              label="Block Contact"
              iconBg="bg-red-100"
              iconColor="text-red-500"
              labelColor="text-red-500"
            />
            <ActionItem
              icon={<Trash2 size={16} />}
              label="Delete Chat"
              iconBg="bg-red-100"
              iconColor="text-red-500"
              labelColor="text-red-500"
            />
          </div>
        </div>
      </div>
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
