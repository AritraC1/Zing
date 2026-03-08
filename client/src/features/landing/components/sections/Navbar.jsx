import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const handleWebAppRouting = (e) => {
    e.preventDefault();
    navigate("/chat");
  };

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <span
              className="text-white font-black text-sm"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              Z
            </span>
          </div>
          <span
            className="text-xl font-black text-slate-900 tracking-tight"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Zing
          </span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          {["Features", "Security", "Download"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="hover:text-emerald-600 transition-colors"
            >
              {l}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#webapp"
            onClick={handleWebAppRouting}
            className="px-5 py-2 rounded-full text-sm font-semibold text-slate-700 border border-slate-200 hover:border-emerald-400 hover:text-emerald-600 transition-all duration-200"
          >
            Log In
          </a>
          <a
            href="#download"
            className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-200 transition-all duration-200 hover:shadow-emerald-300"
          >
            Get the App
          </a>
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className="w-5 flex flex-col gap-1.5">
            <span
              className={`block h-0.5 bg-slate-800 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
            />
            <span
              className={`block h-0.5 bg-slate-800 transition-all ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 bg-slate-800 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
            />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 flex flex-col gap-4 shadow-lg">
          {["Features", "Security", "Download"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="text-slate-700 font-medium"
              onClick={() => setMenuOpen(false)}
            >
              {l}
            </a>
          ))}
          <a
            href="#webapp"
            className="text-emerald-600 font-semibold"
            onClick={() => setMenuOpen(false)}
          >
            Log In →
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
