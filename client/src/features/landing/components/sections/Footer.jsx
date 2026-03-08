const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <span
              className="text-white font-black text-xs"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              Z
            </span>
          </div>
          <span
            className="text-white font-black text-lg"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Zing
          </span>
        </div>
        <div className="flex gap-6 text-sm">
          {["Privacy", "Terms", "Security", "Contact"].map((l) => (
            <a key={l} href="#" className="hover:text-white transition-colors">
              {l}
            </a>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          © 2026 Zing Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
