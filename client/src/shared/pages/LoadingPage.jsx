import React, { useEffect, useState } from "react";

const messages = [
  "Syncing your conversations...",
  "Loading chats & calls...",
  "Almost there...",
  "Warming up the signal...",
];

const LoadingPage = () => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F7FF] relative overflow-hidden">

      {/* Orbs */}
      <div className="absolute w-125 h-125 rounded-full blur-[90px] bg-[radial-gradient(circle,rgba(56,189,248,0.38)_0%,transparent_70%)] -top-35 -left-25 animate-float1" />
      <div className="absolute w-105 h-105 rounded-full blur-[90px] bg-[radial-gradient(circle,rgba(34,197,94,0.28)_0%,transparent_70%)] -bottom-25 -right-20 animate-float2" />
      <div className="absolute w-70 h-70 rounded-full blur-[90px] bg-[radial-gradient(circle,rgba(14,165,233,0.2)_0%,transparent_70%)] top-[45%] left-[58%] animate-float3" />

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center gap-7 w-85 h-75 bg-white/70 border border-sky-300/30 rounded-[28px] backdrop-blur-2xl shadow-lg animate-fadeUp">

        {/* Logo */}
        <div className="drop-shadow-lg">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <defs>
              <linearGradient id="lg1" x1="0" y1="0" x2="44" y2="44">
                <stop stopColor="#0EA5E9" />
                <stop offset="1" stopColor="#22C55E" />
              </linearGradient>
            </defs>
            <rect width="44" height="44" rx="14" fill="url(#lg1)" />
            <path
              d="M13 16C13 14.343 14.343 13 16 13h12c1.657 0 3 1.343 3 3v8c0 1.657-1.343 3-3 3h-2l-4 4-4-4h-2c-1.657 0-3-1.343-3-3v-8z"
              fill="white"
            />
          </svg>
        </div>

        {/* Bars */}
        <div className="flex gap-1.25 h-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1 h-8 rounded-full bg-linear-to-b from-sky-500 to-green-500 animate-wave"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>

        {/* Message */}
        <p
          className={`text-sm text-slate-500 transition-all duration-300 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          }`}
        >
          {messages[msgIndex]}
        </p>

        {/* Progress */}
        <div className="w-45 h-0.75 bg-sky-200 rounded-full overflow-hidden">
          <div className="h-full bg-linear-to-r from-sky-500 to-green-500 animate-progress" />
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;