const PhoneMockup = ({ chat, accent }) => {
  return (
    <div
      className="relative w-55 rounded-[2.5rem] shadow-2xl overflow-hidden border-[6px] shrink-0"
      style={{ borderColor: "#1a1a2e", background: "#f8fafc" }}
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1 bg-white">
        <span className="text-[10px] font-bold text-slate-800">9:41</span>
        <div className="flex gap-1 items-center">
          <div className="w-3 h-1.5 rounded-sm bg-slate-800" />
          <div className="w-1 h-1 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* App top bar */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ background: accent }}
      >
        <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-xs">
          {chat.name[0]}
        </div>
        <div>
          <p className="text-white text-xs font-bold leading-tight">
            {chat.name}
          </p>
          <p className="text-white/70 text-[9px]">online</p>
        </div>
        <div className="ml-auto flex gap-2">
          <div className="w-3 h-3 rounded-full bg-white/40" />
          <div className="w-3 h-3 rounded-full bg-white/40" />
        </div>
      </div>

      {/* Messages */}
      <div className="px-3 py-3 flex flex-col gap-2 min-h-70 bg-slate-50">
        {chat.messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[75%] rounded-2xl px-3 py-1.5 text-[10px] leading-snug shadow-sm"
              style={
                m.from === "me"
                  ? {
                      background: accent,
                      color: "#fff",
                      borderBottomRightRadius: 4,
                    }
                  : {
                      background: "#fff",
                      color: "#1e293b",
                      borderBottomLeftRadius: 4,
                    }
              }
            >
              {m.text}
              <div
                className={`text-[8px] mt-0.5 ${m.from === "me" ? "text-white/60 text-right" : "text-slate-400"}`}
              >
                {m.time} {m.from === "me" && "✓✓"}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <div className="flex gap-1 items-center px-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-400"
              style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-t border-slate-100">
        <div className="flex-1 h-6 rounded-full bg-slate-100 text-[9px] flex items-center px-2 text-slate-400">
          Message…
        </div>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px]"
          style={{ background: accent }}
        >
          ➤
        </div>
      </div>
    </div>
  );
};

export default PhoneMockup;
