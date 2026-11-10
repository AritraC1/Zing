import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { formatClock } from "../../../shared/api/mappers/call";
import { useCall } from "../hooks/useCall";

// Shared call screen for both audio and video 1:1 calls.
// Reads its full state (peer, streams, toggles) from CallProvider; the
// audio/video variant follows the context `callType` so a mid-call
// audio <-> video switch flips this screen without changing who else
// is rendered. The route (`/audio-call` / `/video-call`) only seeds the
// initial URL.
const CallScreen = () => {
  const navigate = useNavigate();
  const {
    callState,
    callType,
    peer,
    localStream,
    remoteStream,
    muted,
    cameraOn,
    callDuration,
    endCall,
    switchToVideo,
    switchToAudio,
    toggleMute,
    toggleCamera,
  } = useCall();

  const remoteAudioRef = useRef(null);
  const [swapped, setSwapped] = useState(false); // tap PIP to swap views
  const isVideo = callType === "video";

  const localVideoTrack = localStream?.getVideoTracks()[0] ?? null;
  // A disabled track sends no frames — treat it as absent for layout.
  const hasLocalVideo = !!localVideoTrack?.enabled;
  const remoteVideoTrack = remoteStream?.getVideoTracks()[0] ?? null;
  const hasRemoteVideo = !!remoteVideoTrack?.enabled;
  const hasBothVideos = hasLocalVideo && hasRemoteVideo;

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

  if (!peer || callState === "incoming") return null;

  // Which stream stars in the big view vs the small PIP window.
  const mainStream = swapped ? localStream : remoteStream;
  const mainIsSelf = swapped;
  const mainHasVideo = mainIsSelf ? hasLocalVideo : hasRemoteVideo;
  const pipStream = mainIsSelf ? remoteStream : localStream;
  const pipHasVideo = mainIsSelf ? hasRemoteVideo : hasLocalVideo;

  // Tap-to-swap only makes sense when both sides are streaming video.
  const canSwap = hasBothVideos && isVideo && callState === "connected";

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

      {/* VIDEO variant: full-screen remote + tappable self PIP.
          The PIP shows YOUR camera from the moment it opens (before the
          callee answers too), like WhatsApp. */}
      {isVideo && (
        <>
          {mainHasVideo && (
            <video
              key={mainStream?.id ?? "main"}
              ref={(el) => {
                if (el) el.srcObject = mainStream || null;
              }}
              autoPlay
              muted // audio plays through the dedicated <audio> element
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Self-preview window — visible while the call rings/connects */}
          {pipHasVideo && (
            <button
              type="button"
              onClick={() => setSwapped((s) => !s)}
              disabled={!canSwap}
              className={`absolute bottom-28 right-4 w-28 h-40 md:w-36 md:h-52 rounded-xl overflow-hidden shadow-lg border-2 border-white/30 z-10 bg-gray-800 transition ${
                canSwap ? "cursor-pointer hover:border-white/60" : "cursor-default"
              }`}
              aria-label={canSwap ? "Swap video views" : "Your preview"}
            >
              <video
                key={pipStream?.id ?? "pip"}
                ref={(el) => {
                  if (el) el.srcObject = pipStream || null;
                }}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {canSwap && (
                <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium text-white/70 bg-black/30 rounded-full mx-3 py-0.5">
                  TAP TO SWAP
                </span>
              )}
            </button>
          )}

          {/* Big-screen placeholder while the peer's video isn't flowing
              (ringing / connecting / peer camera off) */}
          {!mainHasVideo && !mainIsSelf && (
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
                {callState === "connected" ? "" : "WAITING FOR VIDEO..."}
              </p>
            </div>
          )}
          {!mainHasVideo && mainIsSelf && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-0 bg-gray-900">
              <VideoOff className="text-white/40" />
              <p className="text-white/70 text-sm tracking-widest">
                YOUR CAMERA IS OFF
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
                {formatClock(callDuration) || "00:00"}
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
            isVideo ? (
              formatClock(callDuration) || "00:00"
            ) : (
              "CONNECTED"
            )
          ) : (
            statusLabel
          )}
        </div>
      </div>

      {/* CONTROLS */}
      <div className="absolute bottom-8 left-0 right-0 z-20">
        <div className="flex justify-center gap-6 md:gap-8">
          {/* SWITCH BETWEEN AUDIO AND VIDEO (WhatsApp-style mid-call switch) */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={isVideo ? switchToAudio : switchToVideo}
              aria-label={isVideo ? "Switch to voice call" : "Switch to video call"}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-white text-gray-800 border border-gray-200 shadow hover:bg-gray-50 transition"
            >
              {isVideo ? <Phone /> : <VideoIcon />}
            </button>
            <span
              className={`text-xs ${isVideo ? "text-gray-300" : "text-gray-500"}`}
            >
              {isVideo ? "Voice" : "Video"}
            </span>
          </div>

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
