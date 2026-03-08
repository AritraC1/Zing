import Badge from "../../utils/Badge";

const SecuritySection = () => {
  return (
    <section id="security" className="py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">

        {/* Visual */}
        <div className="flex-1 flex justify-center relative">
          <div className="relative w-72 h-72">
            <div className="absolute inset-0 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 animate-pulse" />
            <div className="absolute inset-6 rounded-full bg-linear-to-br from-emerald-200 to-teal-200" />
            <div className="absolute inset-12 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 shadow-xl flex items-center justify-center">
              <span className="text-5xl">🔐</span>
            </div>
            
            {/* Orbiting badges */}
            {["AES-256", "Zero-knowledge", "Open source", "SOC 2"].map(
              (label, i) => {
                const angle = (i * 360) / 4;
                const rad = (angle * Math.PI) / 180;
                const x = 50 + 44 * Math.cos(rad - Math.PI / 2);
                const y = 50 + 44 * Math.sin(rad - Math.PI / 2);
                return (
                  <div
                    key={label}
                    className="absolute bg-white shadow-md border border-emerald-100 rounded-full px-2 py-1 text-[9px] font-bold text-emerald-700 whitespace-nowrap"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%,-50%)",
                    }}
                  >
                    {label}
                  </div>
                );
              },
            )}
          </div>
        </div>

        {/* Copy */}
        <div className="flex-1">
          <Badge>Security First</Badge>
          <h2
            className="mt-5 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Your privacy is not a feature — it's a{" "}
            <span className="text-emerald-500">foundation</span>
          </h2>
          <p className="mt-5 text-slate-500 text-lg leading-relaxed">
            Every message is protected with AES-256 end-to-end encryption. We
            use a zero-knowledge architecture — meaning even Zing's own servers
            cannot read your conversations.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "End-to-end encryption on all messages & calls",
              "Messages auto-delete on schedule",
              "Two-factor authentication built in",
              "No ads. No data selling. Ever.",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-slate-700">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg
                    className="w-3 h-3 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
