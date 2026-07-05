import {
  Phone,
  Video,
  Info,
  PhoneCall,
  PhoneMissed,
  PhoneIncoming,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../chat/hooks/useChat";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";

const CallsList = () => {
  const navigate = useNavigate();
  const { calls = [], clearCalls } = useChat();

  const startCall = (call) => {
    navigate("/audio-call", { state: { chat: call } });
  };

  const startVideoCall = (call) => {
    navigate("/video-call", { state: { chat: call } });
  };

  const totalThisWeek = calls.length;
  const missedCount = calls.filter(
    (c) => c.type === "missed" || c.type === "missed_video",
  ).length;

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50">
      {/* Top bar */}
      <div className="relative flex items-center mb-8 bg-white border-b border-gray-200 px-8 py-3">
        {/* Left */}
        <h1 className="text-2xl font-bold text-gray-900">Calls</h1>

        {/* Center */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search call history..."
              className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 outline-none w-200 rounded-lg"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8 px-8 py-6">
        {/* Activity Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00c896"
                strokeWidth="2.5"
              >
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-400 tracking-widest">
              ACTIVITY
            </span>
          </div>
          <div className="text-4xl font-bold text-teal-500">
            {totalThisWeek}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            <span className="text-teal-500 font-medium">Calls</span> this week
          </div>
        </div>

        {/* Alerts Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <PhoneMissed size={18} className="text-red-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 tracking-widest">
              ALERTS
            </span>
          </div>
          <div className="text-4xl font-bold text-red-400">{missedCount}</div>
          <div className="text-sm text-red-400 mt-1 font-medium">
            Missed recently
          </div>
        </div>

        {/* Quick Action Card */}
        <div
          className="rounded-2xl p-5 text-white flex flex-col justify-between"
          style={{ background: "#0d5c50" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Video size={18} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-white/60 tracking-widest">
              QUICK ACTION
            </span>
          </div>
          <div>
            <p className="text-lg font-bold mb-3">
              Start a new audio/video call
            </p>
            <button
              onClick={() => navigate("/audio-call")}
              className="px-5 py-2 bg-white text-gray-800 text-sm font-semibold rounded-full hover:bg-gray-100 transition"
            >
              New Call
            </button>
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="flex items-center justify-between mb-4 px-8 py-6">
        <h2 className="text-base font-bold text-gray-800">Recent Logs</h2>
        {calls.length > 0 && (
          <button
            onClick={clearCalls}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 tracking-widest"
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Call Log Items */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6 mx-8">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <RotateCcw size={28} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium">No recent calls</p>
          </div>
        ) : (
          calls.map((call, index) => {
            const isMissed =
              call.type === "missed" || call.type === "missed_video";
            const isOutgoing =
              call.type === "outgoing" || call.type === "outgoing_video";
            const isVideo = call.type?.includes("video");
            const name = call.name || call.displayName || "Unknown";

            return (
              <div
                key={call.id || index}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition cursor-pointer ${
                  index !== calls.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base"
                    style={{
                      background: getAvatarGradient(String(call.id || name)),
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                      isMissed ? "bg-red-500" : "bg-teal-500"
                    }`}
                  >
                    {isMissed ? (
                      <PhoneMissed size={10} className="text-white" />
                    ) : isOutgoing ? (
                      <PhoneCall size={10} className="text-white" />
                    ) : (
                      <PhoneIncoming size={10} className="text-white" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{name}</p>
                  <p className="text-xs mt-0.5">
                    <span
                      className={
                        isMissed
                          ? "text-red-400 font-medium"
                          : "text-teal-500 font-medium"
                      }
                    >
                      {isMissed
                        ? isVideo
                          ? "Missed Video Call"
                          : "Missed Call"
                        : isOutgoing
                          ? "Outgoing"
                          : "Incoming"}
                    </span>
                    <span className="text-gray-400">
                      {" "}
                      • {call.time || call.date || ""}
                    </span>
                    {call.duration && (
                      <span className="text-gray-300 italic">
                        {" "}
                        • {call.duration}
                      </span>
                    )}
                  </p>
                </div>

                {/* Call back button */}
                <button
                  onClick={() =>
                    isVideo ? startVideoCall(call) : startCall(call)
                  }
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-teal-50 flex items-center justify-center text-gray-500 hover:text-teal-600 transition shrink-0"
                >
                  {isVideo ? <Video size={16} /> : <Phone size={16} />}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {calls.length > 0 && (
        <div className="flex flex-col items-center text-gray-40 px-8 py-6">
          <RotateCcw size={22} className="mb-2 text-gray-300" />
          <p className="text-sm font-medium text-gray-400">
            End of recent history
          </p>
          <p className="text-xs text-gray-400 mt-1">
            All calls are secured with end-to-end encryption
          </p>
        </div>
      )}
    </div>
  );
};

export default CallsList;
