import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateProfileThunk, uploadAvatarThunk } from "../api/profileThunk";

const UpdateProfileModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();

  // correct slice
  const { loading, user } = useSelector((state) => state.profile);

  const [imagePreview, setImagePreview] = useState(null);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");

  // Pre-fill existing data
  useEffect(() => {
    if (user) {
      // Only update if different
      if (name !== (user.name || user.display_name || "")) {
        setName(user.name || user.displayName || "");
      }

      if (imagePreview !== (user.avatar || null)) {
        setImagePreview(user.avatar || null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async () => {
    try {
      // Update name only if changed
      if (name.trim() && name !== user?.name) {
        await dispatch(updateProfileThunk({ newDisplayName: name })).unwrap();
      }

      // Upload avatar only if selected
      if (file) {
        await dispatch(uploadAvatarThunk({ file })).unwrap();
      }

      onClose();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg w-[90%] max-w-md p-6 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-4 text-center">
          Update Profile
        </h2>

        {/* Image Upload */}
        <div className="flex flex-col items-center mb-4">
          <label className="cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
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

            <input
              type="file"
              className="hidden"
              onChange={handleImageChange}
              accept="image/*"
            />
          </label>
        </div>

        {/* Name Input */}
        <input
          type="text"
          placeholder="Enter your name"
          className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Submit */}
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
