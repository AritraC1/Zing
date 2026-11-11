import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, PhoneOff, Users, Video as VideoIcon, VideoOff } from "lucide-react";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import { formatClock } from "../../../shared/api/mappers/call";
import { useGroupCall } from "../hooks/useGroupCall";
import useAuth from "../../auth/hooks/useAuth";

// One tile in the participant grid: video when the peer's camera is
// flowing, avatar fallback otherwise. Audio plays through a dedicated
// <audio> element per participant.
const ParticipantTile = ({ participant, name, avatarUrl, isSelf, callType }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const stream = isSelf ? undefined : participant?.stream;
  const videoTrack =
    !isSelf && callType === "video"
      ? stream?.getVideoTracks()[0] ?? null
      : null;
  const hasVideo = !!videoTrack && !participant?.videoPaused && videoTrack.enabled;
  const isAudioPaused = !isSelf && Boolean(participant?.audioPaused);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = hasVideo ? stream : null;
    }
  }, [hasVideo, stream]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream || null;
    }
  }, [stream]);

  const displayName = isSelf ? "You" : name;

  return (
    <div className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video">
      {/* Remote audio (invisible) */}
      {!isSelf && <audio ref={audioRef} autoPlay playsInline />}

      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          {avatarUrl || isSelf ? (
            avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : null
          ) : null}
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold ${
              avatarUrl ? "hidden" : ""
            }`}
            style={{ background: getAvatarGradient(String(participant?.peerId || name)) }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          {isSelf && callType === "video" ? (
            <span className="text-[10px] tracking-widest text-gray-400">
              CAMERA OFF
            </span>
          ) : null}
        </div>
      )}

      {/* Name + muted state */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-white bg-black/40 rounded-full px-2.5 py-1 truncate max-w-[80%]">
          {displayName}
        </span>
        {(isSelf ? false : isAudioPaused) && (
          <MicOff size={13} className="text-red-400 bg-black/40 rounded-full p-0.5" />
        )}
      </div>
    </div>
  );
};

// Group call screen: a grid of up to 5 tiles (self + peers) with the
// SFU doing the mixing of media routes — the client just renders every
// MediaStream it subscribed to.
const GroupCallScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    groupCallState,
    callInfo,
    initiator,
    participants,
    localStream,
    muted,
    cameraOn,
    callDuration,
    leaveGroupCall,
    endGroupCall,
    toggleMute,
    toggleCamera,
  } = useGroupCall();

  const localVideoRef = useRef(null);
  const isVideo = callInfo?.callType === "video";
  const isInitiator = initiator?.id === user?.id;

  // Not in an active call (URL typed directly) -> back to calls list
  useEffect(() => {
    if (!callInfo || groupCallState === "incoming") {
      navigate("/call", { replace: true });
    }
  }, [callInfo, groupCallState, navigate]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  if (!callInfo || groupCallState === "incoming") return null;

  const localHasVideo =
    isVideo && !!localStream?.getVideoTracks()[0]?.enabled && cameraOn;

  const statusLabel =
    groupCallState === "connecting"
      ? "CONNECTING..."
      : groupCallState === "connected"
        ? formatClock(callDuration) || "00:00"
        : "PLEASE WAIT";

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-gray-900">
      {/* Header */}
      <div className="absolute top-5 left-0 right-0 z-20 flex flex-col items-center">
        <h1 className="text-xl font-semibold text-white truncate max-w-[70%] px-4 text-center">
          {callInfo.name}
        </h1>
        <div className="mt-1.5 flex items-center gap-2 text-teal-300 text-sm font-medium tracking-wider">
          <Users size={15} />
          <span>
            {statusLabel} · {participants.length + 1}/{5}
          </span>
        </div>
      </div>

      {/* Participant grid */}
      <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-32">
        <div
          className={`grid gap-3 w-full max-w-4xl ${
            participants.length + 1 <= 2
              ? "grid-cols-1 max-w-2xl"
              : participants.length + 1 <= 4
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-3"
          }`}
        >
          {/* Self tile first */}
          {isVideo && localHasVideo ? (
            <div className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <span className="absolute bottom-2 left-2 text-[11px] font-medium text-white bg-black/40 rounded-full px-2.5 py-1">
                You
              </span>
            </div>
          ) : (
            <ParticipantTile
              participant={null}
              name={user?.displayName || "You"}
              avatarUrl={null}
              isSelf
              callType={callInfo.callType}
            />
          )}

          {participants.map((participant) => (
            <ParticipantTile
              key={participant.peerId}
              participant={participant}
              name={participant.name}
              avatarUrl={participant.avatarUrl}
              isSelf={false}
              callType={callInfo.callType}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 z-20">
        <div className="flex justify-center gap-6 md:gap-8">
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

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className={`w-14 h-14 rounded-full flex items-center justify-center border shadow transition ${
                muted
                  ? "bg-red-500 text-white border-red-500 hover:bg-red-600"
                  : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {muted ? <MicOff /> : <Mic />}
            </button>
            <span className="text-xs text-gray-300">{muted ? "Unmute" : "Mute"}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={isInitiator ? endGroupCall : leaveGroupCall}
              aria-label={isInitiator ? "End call for everyone" : "Leave call"}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-90 transition"
            >
              <PhoneOff />
            </button>
            <span className="text-xs text-gray-300">
              {isInitiator ? "End" : "Leave"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCallScreen;
