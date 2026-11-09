import { Phone, PhoneOff, Video } from "lucide-react";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useCall } from "../hooks/useCall";

// Full-screen incoming call prompt rendered app-wide by CallProvider,
// so the user gets rung on any page (chat list, profile, calls list...).
const IncomingCallOverlay = () => {
  const { callState, callType, peer, acceptCall, rejectCall } = useCall();

  if (callState !== "incoming" || !peer) return null;

  const isVideo = callType === "video";

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        {/* Avatar with ripple */}
        <div className="relative flex justify-center mb-2">
          <span className="absolute w-44 h-44 rounded-full bg-teal-400/20 animate-ping" />
          <span className="absolute w-56 h-56 rounded-full bg-teal-400/10 animate-ping delay-300" />
          {peer.avatarUrl ? (
            <img
              src={peer.avatarUrl}
              alt={peer.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-teal-500/80 z-10"
            />
          ) : (
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-semibold border-4 border-teal-500/80 z-10"
              style={{ background: getAvatarGradient(String(peer.id || peer.name)) }}
            >
              {peer.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Caller + call type */}
        <div>
          <h2 className="text-2xl font-bold text-white">{peer.name}</h2>
          <p className="mt-2 text-teal-300 tracking-wider text-sm font-medium flex items-center justify-center gap-2">
            {isVideo ? <Video size={16} /> : <Phone size={16} />}
            {isVideo ? "INCOMING VIDEO CALL" : "INCOMING AUDIO CALL"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-10 mt-2">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={rejectCall}
              aria-label="Decline call"
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-90 transition"
            >
              <PhoneOff size={24} />
            </button>
            <span className="text-xs text-gray-400">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={acceptCall}
              aria-label="Accept call"
              className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 active:scale-90 transition"
            >
              <Phone size={24} />
            </button>
            <span className="text-xs text-gray-400">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallOverlay;

