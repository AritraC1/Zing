import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  getMyDetailsThunk,
  updateProfileThunk,
  uploadAvatarThunk,
} from "../api/profileThunk";

const UpdateProfileModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.profile.loading);

  const [imagePreview, setImagePreview] = useState(null);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!isOpen || !user) return;

    setName(user.displayName || "");
    setImagePreview(user.avatarUrl || null);
    setFile(null);
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setFile(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const hasNameChange =
      trimmedName.length > 0 && trimmedName !== user?.displayName;

    if (!hasNameChange && !file) {
      toast.error("Change your name or upload a photo before saving");
      return;
    }

    try {
      if (hasNameChange) {
        await dispatch(
          updateProfileThunk({ newDisplayName: trimmedName }),
        ).unwrap();
      }

      if (file) {
        await dispatch(uploadAvatarThunk({ file })).unwrap();
      }

      await dispatch(getMyDetailsThunk()).unwrap();
      toast.success("Profile updated");
      onClose();
    } catch (err) {
      const message =
        typeof err === "string"
          ? err
          : err?.message || err?.error || "Failed to update profile";
      toast.error(message);
      console.error("Profile update error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-2xl shadow-lg w-[90%] max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-4 text-center">
          Update Profile
        </h2>

        <div className="flex flex-col items-center mb-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer"
          >
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:opacity-90 transition">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500 text-sm">Upload</span>
              )}
            </div>
          </button>

          <p className="text-xs text-gray-500 mt-2">
            {file ? "Photo selected" : "Tap to upload photo"}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleImageChange}
            accept="image/*"
          />
        </div>

        <input
          type="text"
          placeholder="Enter your name"
          className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          onClick={handleSubmit}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default UpdateProfileModal;
