import { Phone, PhoneOff, Users, Video } from "lucide-react";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useGroupCall } from "../hooks/useGroupCall";

// Full-screen incoming group call prompt rendered app-wide by
// GroupCallProvider, so the ring is visible on any page. Declining
// simply dismisses the ring — the call continues without this user.
const IncomingGroupCallOverlay = () => {
  const { groupCallState, callInfo, initiator, joinIncomingGroupCall, declineIncomingGroupCall } =
    useGroupCall();

  if (groupCallState !== "incoming" || !callInfo) return null;

  const isVideo = callInfo.callType === "video";

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        {/* Caller avatar with ripple */}
        <div className="relative flex justify-center mb-2">
          <span className="absolute w-44 h-44 rounded-full bg-teal-400/20 animate-ping" />
          <span className="absolute w-56 h-56 rounded-full bg-teal-400/10 animate-ping delay-300" />
          {initiator?.avatarUrl ? (
            <img
              src={initiator.avatarUrl}
              alt={initiator.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-teal-500/80 z-10"
            />
          ) : (
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-semibold border-4 border-teal-500/80 z-10"
              style={{ background: getAvatarGradient(String(initiator?.id || initiator?.name)) }}
            >
              {initiator?.name?.charAt(0).toUpperCase() || "G"}
            </div>
          )}
        </div>

        {/* Group + caller info */}
        <div>
          <h2 className="text-2xl font-bold text-white">{callInfo.name}</h2>
          <p className="mt-1 text-gray-400 text-sm flex items-center justify-center gap-1.5">
            <Users size={14} />
            {initiator?.name} started a call
          </p>
          <p className="mt-3 text-teal-300 tracking-wider text-sm font-medium flex items-center justify-center gap-2">
            {isVideo ? <Video size={16} /> : <Phone size={16} />}
            {isVideo ? "INCOMING GROUP VIDEO CALL" : "INCOMING GROUP CALL"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-10 mt-2">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={declineIncomingGroupCall}
              aria-label="Decline call"
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-90 transition"
            >
              <PhoneOff size={24} />
            </button>
            <span className="text-xs text-gray-400">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={joinIncomingGroupCall}
              aria-label="Join call"
              className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 active:scale-90 transition"
            >
              <Phone size={24} />
            </button>
            <span className="text-xs text-gray-400">Join</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingGroupCallOverlay;
