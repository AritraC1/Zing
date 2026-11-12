import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  completeUserOnboardThunk,
  getMyDetailsThunk,
  uploadAvatarThunk,
} from "../api/profileThunk";
import { clearUserState } from "../store/profileReducer";
import generateDeviceDetails from "../../../shared/utils/generateDeviceDetails";
import {
  Camera,
  User,
  Check,
  ArrowRight,
  ShieldCheck,
  X,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";

const ProfileSetupPage = () => {
  const [name, setName] = useState("");
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state) => state.profile);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, or WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be under 5MB");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveAvatar = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isReady = name.trim().length >= 4;

  const handleContinue = async (e) => {
    if (e) e.preventDefault();
    if (!isReady || loading) return;

    try {
      const { deviceId, deviceType } = generateDeviceDetails();

      // Complete onboarding
      await dispatch(
        completeUserOnboardThunk({
          displayName: name.trim(),
          deviceId,
          deviceType,
        }),
      ).unwrap();

      // Upload avatar only if selected (optional)
      if (selectedFile) {
        await dispatch(uploadAvatarThunk({ file: selectedFile })).unwrap();
      }

      await dispatch(getMyDetailsThunk());

      toast.success("Profile setup complete!");
      navigate("/chat");
    } catch (err) {
      console.error("Profile setup failed:", err);
      const message =
        typeof err === "string"
          ? err
          : err?.message || "Failed to set up profile. Please try again.";
      toast.error(message);
    }
  };

  useEffect(() => {
    return () => {
      dispatch(clearUserState());
    };
  }, [dispatch]);

  // Loading Dots Animation
  const LoadingDots = () => (
    <div className="flex items-center justify-center gap-1.5 py-0.5">
      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-linear-to-b from-white via-slate-50/50 to-emerald-50/30 pointer-events-none" />

      {/* Decorative Ambient Blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 sm:w-lg sm:h-128 rounded-full bg-emerald-200/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 sm:w-md sm:h-112 rounded-full bg-teal-200/40 blur-3xl pointer-events-none" />

      {/* Subtle Dot Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, #10b98133 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 pt-2 sm:pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <span
              className="text-white font-black text-sm"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              Z
            </span>
          </div>
          <span
            className="text-lg font-black text-slate-900 tracking-tight"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Zing
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200/60 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Final Step</span>
        </div>
      </header>

      {/* Main Profile Setup Card */}
      <main className="w-full max-w-md my-auto z-10 py-6 sm:py-8">
        <div className="backdrop-blur-xl bg-white/90 border border-slate-200/70 shadow-2xl shadow-slate-200/50 rounded-3xl p-6 sm:p-9 transition-all duration-300">
          {/* Card Header */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
              Set up your profile
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Choose your profile photo and enter your name to complete your Zing
              account.
            </p>
          </div>

          <form onSubmit={handleContinue} className="mt-8 space-y-7">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div
                  className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-linear-to-tr from-emerald-400 via-teal-400 to-emerald-500 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-105 ${
                    isDragging ? "ring-4 ring-emerald-500/30 scale-105" : ""
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center relative">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors">
                        <Camera className="w-8 h-8 stroke-[1.8] mb-1" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider">
                          Add Photo
                        </span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[11px] font-medium">
                        {preview ? "Change" : "Upload"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remove Photo Button */}
                {preview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute top-0 right-0 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition-colors cursor-pointer"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Photo is optional</span>
              </p>
            </div>

            {/* Display Name Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Full Name
                </label>
                <span className="text-xs text-slate-400 font-mono">
                  {name.length}/40
                </span>
              </div>

              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400 pointer-events-none">
                  <User className="w-5 h-5 stroke-[1.8]" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  autoFocus
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-base font-medium focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200"
                />
                {isReady && (
                  <div className="absolute right-4 text-emerald-600 pointer-events-none">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                )}
              </div>

              {name.length > 0 && name.trim().length < 4 && (
                <p className="text-xs text-rose-500 mt-2 font-medium">
                  Display name must be at least 4 characters
                </p>
              )}

              {error && (
                <p className="text-xs text-rose-500 mt-2 font-medium">
                  {typeof error === "string"
                    ? error
                    : error?.message || "Something went wrong"}
                </p>
              )}
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={!isReady || loading}
              className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm text-white bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <LoadingDots />
              ) : (
                <>
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Trust Badge */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Private & secure messaging</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center z-10 pb-2">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Zing. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default ProfileSetupPage;