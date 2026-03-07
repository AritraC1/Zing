import { useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Video,
  VideoOff
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const AudioCallPage = () => {
  const navigate = useNavigate(); 
  const location = useLocation();
  const chat = location.state?.chat;

  const [status, setStatus] = useState("calling"); // calling | connected
  const [seconds, setSeconds] = useState(0);
  const [mute, setMute] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [video, setVideo] = useState(false);

  useEffect(() => {
    if (status === "connected") {
      const timer = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status]);

  const formatTime = () => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const endCall = () => {
    setStatus("ended");
    navigate("/");
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">

      <div className="text-center">

        {/* Avatar with ripple */}
        <div className="relative flex justify-center mb-8">

          {status === "calling" && (
            <>
              <span className="absolute w-40 h-40 rounded-full bg-blue-400/20 animate-ping"></span>
              <span className="absolute w-52 h-52 rounded-full bg-blue-400/10 animate-ping delay-300"></span>
            </>
          )}

          <div className="w-32 h-32 rounded-full bg-linear-to-br from-blue-500 to-teal-500 text-white flex items-center justify-center text-4xl font-semibold shadow-lg z-10">
            {chat.name.charAt(0)}
          </div>
        </div>

        {/* Name */}
        <h1 className="text-2xl font-semibold text-gray-800">
          {chat.name}
        </h1>

        {/* Status */}
        <div className="mt-3 text-teal-600 tracking-wider text-sm font-medium">

          {status === "calling" && "CALLING..."}

          {status === "connected" && (
            <div className="flex flex-col items-center gap-2">
              <span className="flex items-center gap-2">
                <Volume2 size={16} />
                CONNECTED
              </span>

              <span className="text-4xl font-light text-gray-600 tracking-widest mt-3">
                {formatTime()}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-10 mt-12">

          {/* Mute */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setMute(!mute)}
              className="w-14 h-14 rounded-full bg-white shadow border flex items-center justify-center hover:bg-gray-50"
            >
              {mute ? <MicOff /> : <Mic />}
            </button>
            <span className="text-xs text-gray-500">Mute</span>
          </div>

          {/* End */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600"
            >
              <PhoneOff />
            </button>
            <span className="text-xs text-gray-500">End</span>
          </div>

          {/* Speaker */}
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

        {/* Video toggle */}
        <div className="flex justify-center mt-10">
          <button
            onClick={() => setVideo(!video)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border shadow hover:bg-gray-50 text-sm"
          >
            {video ? <VideoOff size={18} /> : <Video size={18} />}
            {video ? "Turn Video Off" : "Start Video"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioCallPage;