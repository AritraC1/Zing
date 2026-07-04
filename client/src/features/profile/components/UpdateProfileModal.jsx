import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getMyDetailsThunk,
  updateProfileThunk,
  uploadAvatarThunk,
} from "../api/profileThunk";

const UpdateProfileModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.profile.loading);

  const [imagePreview, setImagePreview] = useState(null);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (user) {
      if (name !== (user.displayName || "")) {
        setName(user.displayName || "");
      }

      if (imagePreview !== (user.avatarUrl || null)) {
        setImagePreview(user.avatarUrl || null);
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
      if (name.trim() && name !== user?.displayName) {
        await dispatch(updateProfileThunk({ newDisplayName: name })).unwrap();
      }

      if (file) {
        await dispatch(uploadAvatarThunk({ file })).unwrap();
      }

      await dispatch(getMyDetailsThunk());
      onClose();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg w-[90%] max-w-md p-6 relative">
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
