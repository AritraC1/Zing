import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  completeUserOnboardThunk,
  getMyDetailsThunk,
  uploadAvatarThunk,
} from "../api/profileThunk";
import { clearUserState } from "../store/profileReducer";
import generateDeviceDetails from "../../../shared/utils/generateDeviceDetails";

const ProfileSetupPage = () => {
  const [name, setName] = useState("");
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state) => state.profile);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const isReady = name.trim().length >= 4;

  const handleContinue = async () => {
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

      navigate("/chat");
    } catch (err) {
      console.error("Profile setup failed:", err);
    }
  };

  useEffect(() => {
    return () => {
      dispatch(clearUserState());
    };
  }, [dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-linear-to-br from-blue-100 via-white to-emerald-100">
      <div className="w-full max-w-sm backdrop-blur-xl bg-white/70 border border-white/40 shadow-xl rounded-3xl px-8 py-10 flex flex-col items-center gap-7 transition-all duration-300 hover:shadow-2xl">
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Set up your profile
          </h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div
            className="cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="relative w-28 h-28 rounded-full p-0.5 bg-linear-to-tr from-blue-500 via-cyan-500 to-emerald-500 transition-transform duration-300 group-hover:scale-105">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-xs">Upload</span>
                )}
              </div>

              <div className="absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-40 bg-emerald-400 transition"></div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          <p className="text-xs text-gray-500">
            {preview ? "Change photo" : "Upload photo (optional)"}
          </p>
        </div>

        {/* Name Input */}
        <div className="w-full">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/80 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
          />

          {name.length > 0 && name.trim().length < 4 && (
            <p className="text-xs text-red-500 mt-2">
              Display name must be at least 4 characters
            </p>
          )}

          {error && (
            <p className="text-xs text-red-500 mt-2">
              {typeof error === "string"
                ? error
                : error?.message || "Something went wrong"}
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          disabled={!isReady || loading}
          onClick={handleContinue}
          className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-300
            ${
              isReady && !loading
                ? "bg-blue-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
