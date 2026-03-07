import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2, Video, VideoOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const VideoCallPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const chat = location.state?.chat;

  const localVideoRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("calling");
  const [seconds, setSeconds] = useState(0);
  const [mute, setMute] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [video, setVideo] = useState(true);

  // TIMER
  useEffect(() => {
    if (status === "connected") {
      const timer = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status]);

  // STOP CAMERA + MIC
  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  // CAMERA + MIC PERMISSION
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        streamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setStatus("connected");
      } catch (err) {
        console.error("Permission denied", err);
        alert("Camera or Microphone permission denied.");
      }
    };

    startCamera();

    return () => {
      stopMediaStream();
    };
  }, []);

  // STOP CAMERA IF USER LEAVES PAGE
  useEffect(() => {
    const handleLeave = () => stopMediaStream();

    window.addEventListener("beforeunload", handleLeave);

    return () => {
      window.removeEventListener("beforeunload", handleLeave);
    };
  }, []);

  // FORMAT TIMER
  const formatTime = () => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // END CALL
  const endCall = () => {
    stopMediaStream();
    navigate("/");
  };

  // MUTE
  const toggleMute = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];

    if (audioTrack) {
      audioTrack.enabled = mute;
      setMute(!mute);
    }
  };

  // VIDEO TOGGLE
  const toggleVideo = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = !video;
      setVideo(!video);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      {/* VIDEO AREA */}
      <div className="relative w-full max-w-4xl h-[60vh] bg-black rounded-xl overflow-hidden shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {!video && (
          <div className="absolute inset-0 flex items-center justify-center bg-black text-white text-xl">
            Camera Off
          </div>
        )}
      </div>

      {/* NAME */}
      <h1 className="text-2xl font-semibold text-gray-800 mt-6">
        {chat?.name}
      </h1>

      {/* STATUS */}
      <div className="mt-2 text-teal-600 tracking-wider text-sm font-medium">
        {status === "calling" && "CONNECTING..."}

        {status === "connected" && (
          <div className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-2">
              <Volume2 size={16} />
              CONNECTED
            </span>

            <span className="text-3xl font-light text-gray-600 tracking-widest">
              {formatTime()}
            </span>
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div className="flex justify-center gap-10 mt-10">
        {/* MUTE */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-14 h-14 rounded-full bg-white shadow border flex items-center justify-center hover:bg-gray-50"
          >
            {mute ? <MicOff /> : <Mic />}
          </button>
          <span className="text-xs text-gray-500">Mute</span>
        </div>

        {/* END */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600"
          >
            <PhoneOff />
          </button>
          <span className="text-xs text-gray-500">End</span>
        </div>

        {/* CAMERA */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={toggleVideo}
            className="w-14 h-14 rounded-full bg-white shadow border flex items-center justify-center hover:bg-gray-50"
          >
            {video ? <Video /> : <VideoOff />}
          </button>
          <span className="text-xs text-gray-500">Camera</span>
        </div>

        {/* SPEAKER */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setSpeaker(!speaker)}
            className="w-14 h-14 rounded-full bg-white shadow border flex items-center justify-center hover:bg-gray-50"
          >
            <Volume2 />
          </button>
          <span className="text-xs text-gray-500">Speaker</span>
        </div>
      </div>
    </div>
  );
};

export default VideoCallPage;
