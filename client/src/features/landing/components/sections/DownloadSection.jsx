import GradientBlob from "../../utils/GradientBlob";
import { useNavigate } from "react-router-dom";

const DownloadSection = () => {
  const navigate = useNavigate();

  const handleWebAppRouting = (e) => {
    e.preventDefault();
    navigate("/auth");
  };

  return (
    <section
      id="download"
      className="py-24 px-6 bg-linear-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden"
    >
      <GradientBlob className="w-96 h-96 bg-emerald-500 -top-20 -right-20" />
      <GradientBlob className="w-72 h-72 bg-teal-500 bottom-0 left-0" />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur text-emerald-300 border border-emerald-400/30 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Free on all platforms
        </div>
        <h2
          className="text-4xl sm:text-6xl font-black text-white leading-tight mb-6"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Start Zinging today
        </h2>
        <p className="text-slate-300 text-lg mb-12">
          Download the app or open the web version — your account, contacts, and
          messages sync everywhere, instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          
          {/* App Store */}
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold hover:bg-slate-100 transition-all hover:shadow-2xl hover:-translate-y-1 duration-200"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store
          </a>

          {/* Google Play Store */}
          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-emerald-500 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-emerald-400 transition-all hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-1 duration-200"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="white"
                d="M1.22 0L13.2 12 1.22 24c-.4-.2-.72-.6-.72-1.2V1.2C.5.6.82.2 1.22 0zM17.4 7.8l-4.2 4.2-11.98-12L14.6 5.4l2.8 2.4zM17.4 16.2l-2.8 2.4-13.38-5.4L13.2 9zM22.5 12c0 1-.5 1.8-1.3 2.3l-3.8 2.1-4.2-4.4 4.2-4.2 3.8 2.1c.8.5 1.3 1.3 1.3 2.1z"
              />
            </svg>
            Google Play
          </a>

          {/* Web App */}
          <a
            href="#webapp"
            onClick={handleWebAppRouting}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/20 text-white font-semibold hover:bg-white/10 transition-all hover:-translate-y-1 duration-200"
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
            Log In to Web App
          </a>
        </div>

        {/* QR hint */}
        <p className="mt-10 text-slate-400 text-sm">
          Scan a QR code in the app to log in on desktop — no password needed.
        </p>
      </div>
    </section>
  );
};

export default DownloadSection;
