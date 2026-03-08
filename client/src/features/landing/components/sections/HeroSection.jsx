import { useNavigate } from "react-router-dom";
import Badge from "../../utils/Badge";
import PhoneMockup from "../PhoneMockup";
import GradientBlob from "../../utils/GradientBlob";

const chat1 = {
  name: "Ash Chen",
  messages: [
    { from: "them", text: "Are you coming tonight? 🎉", time: "7:12 PM" },
    { from: "me", text: "Absolutely! Can't wait 🔥", time: "7:13 PM" },
    { from: "them", text: "Yasss! It's gonna be epic", time: "7:13 PM" },
    { from: "me", text: "Send me the location 📍", time: "7:14 PM" },
  ],
};

const chat2 = {
  name: "Team Rocket 🚀",
  messages: [
    { from: "them", text: "Sprint review @ 3pm ✅", time: "10:01 AM" },
    { from: "me", text: "On it! Demo is ready 💪", time: "10:03 AM" },
    { from: "them", text: "Great work everyone!", time: "10:05 AM" },
    { from: "me", text: "Let's ship it 🚀", time: "10:06 AM" },
  ],
};

const HeroSection = () => {
  const navigate = useNavigate();

  const handleWebAppRouting = (e) => {
    e.preventDefault();
    navigate("/auth");
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 overflow-hidden">
      {/* Background base */}
      <div className="absolute inset-0 bg-linear-to-br from-white via-emerald-50/30 to-teal-50/40 pointer-events-none" />

      {/* Single soft ambient blob top-right */}
      <GradientBlob className="w-137.5 h-137.5 bg-emerald-200 -top-32 -right-32" />

      {/* Single soft ambient blob bottom-left */}
      <GradientBlob className="w-100 h-100 bg-teal-100 -bottom-20 -left-20" />

      {/* Minimal dot grid, very faint, only in corners */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #10b98122 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, black 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, black 100%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16">
        {/* Left copy */}
        <div className="flex-1 text-center lg:text-left fadein">
          <div className="mb-6">
            <Badge>Now Available on iOS & Android</Badge>
          </div>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Talk Faster.{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-linear-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                Connect
              </span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="8"
                viewBox="0 0 200 8"
                fill="none"
              >
                <path
                  d="M2 6 Q50 2 100 5 Q150 8 198 4"
                  stroke="url(#ug)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                <defs>
                  <linearGradient id="ug" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
            </span>{" "}
            Deeper.
          </h1>
          <p className="text-slate-500 text-lg sm:text-xl leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
            Zing brings real-time messaging, HD calls, and file sharing into one
            beautifully fast app — for every device you own.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            {/* App Store */}
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-slate-900 text-white px-6 py-3.5 rounded-2xl hover:bg-slate-800 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 group"
            >
              <svg
                className="w-6 h-6 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <div className="text-[10px] text-slate-300 leading-none">
                  Download on the
                </div>
                <div className="text-sm font-bold leading-tight">App Store</div>
              </div>
            </a>

            {/* Play Store */}
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white text-slate-900 px-6 py-3.5 rounded-2xl border-2 border-slate-200 hover:border-emerald-400 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M1.22 0L13.2 12 1.22 24c-.4-.2-.72-.6-.72-1.2V1.2C.5.6.82.2 1.22 0z"
                />
                <path
                  fill="#FBBC05"
                  d="M17.4 7.8l-4.2 4.2-11.98-12L14.6 5.4l2.8 2.4z"
                />
                <path
                  fill="#34A853"
                  d="M17.4 16.2l-2.8 2.4-13.38-5.4L13.2 9z"
                />
                <path
                  fill="#4285F4"
                  d="M22.5 12c0 1-.5 1.8-1.3 2.3l-3.8 2.1-4.2-4.4 4.2-4.2 3.8 2.1c.8.5 1.3 1.3 1.3 2.1z"
                />
              </svg>
              <div className="text-left">
                <div className="text-[10px] text-slate-500 leading-none">
                  Get it on
                </div>
                <div className="text-sm font-bold leading-tight">
                  Google Play
                </div>
              </div>
            </a>

            {/* Web App */}
            <a
              href="#webapp"
              onClick={handleWebAppRouting}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-emerald-500 text-emerald-600 font-semibold hover:bg-emerald-50 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Open Web App
            </a>
          </div>
        </div>

        {/* Right phones */}
        <div className="flex-1 flex justify-center items-end gap-6 relative min-h-105">
          <div className="float-1 mt-8">
            <PhoneMockup chat={chat1} accent="#10b981" />
          </div>
          <div className="float-2 -mt-4">
            <PhoneMockup chat={chat2} accent="#0d9488" />
          </div>

          {/* Decorative blobs behind phones */}
          <div className="absolute w-64 h-64 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 blur-2xl -z-10" />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-linear-to-b from-slate-300 to-transparent" />
      </div>
    </section>
  );
};

export default HeroSection;
