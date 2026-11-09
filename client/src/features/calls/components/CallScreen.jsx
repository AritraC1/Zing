import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { useCall } from "../hooks/useCall";

// Shared call screen for both audio and video 1:1 calls.
// Reads its full state (peer, streams, toggles) from CallProvider.
const CallScreen = ({ isVideo }) => {
  const navigate = useNavigate();
  const {
    callState,
    peer,
    localStream,
    remoteStream,
    muted,
    cameraOn,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCall();

  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const [seconds, setSeconds] = useState(0);

  // Not in an active call (e.g. URL typed directly) -> back to calls list
  useEffect(() => {
    if (!peer || callState === "incoming") {
      navigate("/call", { replace: true });
    }
  }, [peer, callState, navigate]);

  // Attach remote audio for both variants
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  // Attach remote video for the video variant
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  // Local PIP (video variant)
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = isVideo ? localStream || null : null;
    }
  }, [isVideo, localStream]);

  // Call timer — interval only lives while connected; the cleanup also
  // resets the counter when the call state drops back.
  useEffect(() => {
    if (callState !== "connected") return undefined;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);

    return () => {
      clearInterval(timer);
      setSeconds(0);
    };
  }, [callState]);

  const formatTime = () => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!peer || callState === "incoming") return null;

  const statusLabel =
    callState === "outgoing"
      ? "CALLING..."
      : callState === "connecting"
        ? "CONNECTING..."
        : callState === "connected"
          ? "CONNECTED"
          : "PLEASE WAIT";

  return (
    <div
      className={`fixed inset-0 z-[90] flex flex-col items-center ${
        isVideo ? "bg-black" : "bg-gray-100"
      }`}
    >
      {/* Remote audio (invisible) plays for both variants */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* VIDEO variant: remote full-screen + local PIP */}
      {isVideo && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {remoteStream && (
            <div className="absolute bottom-28 right-4 w-28 h-40 md:w-36 md:h-52 rounded-xl overflow-hidden shadow-lg border-2 border-white/30 z-10 bg-gray-800">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {(!remoteStream || !cameraOn) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-0">
              {peer.avatarUrl ? (
                <img
                  src={peer.avatarUrl}
                  alt={peer.name}
                  className="w-28 h-28 rounded-full object-cover border-4 border-teal-500/50"
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-semibold"
                  style={{ background: getAvatarGradient(String(peer.id || peer.name)) }}
                >
                  {peer.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-white/70 text-sm tracking-widest">
                WAITING FOR VIDEO...
              </p>
            </div>
          )}
        </>
      )}

      {/* AUDIO variant: avatar hero + remote stream indicator */}
      {!isVideo && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative flex justify-center mb-8">
            {callState !== "connected" && (
              <>
                <span className="absolute w-40 h-40 rounded-full bg-teal-400/20 animate-ping" />
                <span className="absolute w-52 h-52 rounded-full bg-teal-400/10 animate-ping delay-300" />
              </>
            )}
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

          {callState === "connected" && (
            <span className="flex items-center gap-2 text-teal-600 text-sm tracking-wider font-medium">
              <Volume2 size={16} />
              <span className="text-3xl font-light text-gray-600 tracking-widest">
                {formatTime()}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Name + status (overlays video variant) */}
      <div className="absolute top-6 left-0 right-0 flex flex-col items-center z-20">
        <h1
          className={`text-2xl font-semibold ${isVideo ? "text-white" : "text-gray-800"}`}
        >
          {peer.name}
        </h1>
        <div
          className={`mt-2 tracking-wider text-sm font-medium ${
            isVideo ? "text-teal-300" : "text-teal-600"
          }`}
        >
          {callState === "connected" ? (
            !isVideo ? (
              "CONNECTED"
            ) : (
              formatTime()
            )
          ) : (
            statusLabel
          )}
        </div>
      </div>

      {/* CONTROLS */}
      <div className="absolute bottom-8 left-0 right-0 z-20">
        <div className="flex justify-center gap-8 md:gap-10">
          {/* MUTE */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className={`w-14 h-14 rounded-full flex items-center justify-center border shadow transition ${
                muted
                  ? "bg-red-500 text-white border-red-500 hover:bg-red-600"
                  : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
              } ${isVideo ? "" : "bg-white"}`}
            >
              {muted ? <MicOff /> : <Mic />}
            </button>
            <span
              className={`text-xs ${isVideo ? "text-gray-300" : "text-gray-500"}`}
            >
              {muted ? "Unmute" : "Mute"}
            </span>
          </div>

          {/* END */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={endCall}
              aria-label="End call"
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-90 transition"
            >
              <PhoneOff />
            </button>
            <span
              className={`text-xs ${isVideo ? "text-gray-300" : "text-gray-500"}`}
            >
              End
            </span>
          </div>

          {/* CAMERA (video only) */}
          {isVideo && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={toggleCamera}
                aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
                className={`w-14 h-14 rounded-full flex items-center justify-center border shadow transition ${
                  cameraOn
                    ? "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                    : "bg-red-500 text-white border-red-500 hover:bg-red-600"
                }`}
              >
                {cameraOn ? <VideoIcon /> : <VideoOff />}
              </button>
              <span className="text-xs text-gray-300">
                {cameraOn ? "Camera" : "Camera Off"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallScreen;
