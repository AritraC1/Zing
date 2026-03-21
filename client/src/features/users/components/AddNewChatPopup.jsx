import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addChat } from "../../chat/store/chatReducer";
import { searchUserThunk } from "../api/usersThunk";
import { clearUser } from "../store/usersReducer";

const AddNewChatPopup = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");

  const { user, loading, error } = useSelector((state) => state.users);

  // Debounced search
  useEffect(() => {
  const delay = setTimeout(() => {
    const cleaned = "+" + search.replace(/\D/g, "");

    if (cleaned.length === 13) {
      dispatch(searchUserThunk({ phoneNumber: cleaned }));
    } else {
      dispatch(clearUser());
    }
  }, 500);

  return () => clearTimeout(delay);
}, [search, dispatch]);

  const handleAddChat = (user) => {
    const newChat = {
      id: user.id || crypto.randomUUID(),
      name: user.name,
      message: "Start chatting...",
      time: "Now",
    };

    dispatch(addChat(newChat));
    handleClose();
  };

  const handleClose = () => {
    setSearch("");
    dispatch(clearUser());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-125 max-w-[90%] bg-white rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-semibold">Add New Chat</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-black text-lg"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search by phone number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* States */}
        {loading && <p className="text-sm text-gray-500">Searching...</p>}

        {error && (
          <p className="text-sm text-red-500">
            {typeof error === "string"
              ? error
              : error?.message || "Something went wrong"}
          </p>
        )}

        {!loading && search.length >= 10 && !user && (
          <p className="text-sm text-gray-500">No user found</p>
        )}

        {/* User Result */}
        {user && (
          <div
            onClick={() => handleAddChat(user)}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition"
          >
            <img
              src={user?.profilePic}
              alt="profile"
              className="w-12 h-12 rounded-full object-cover"
            />

            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">{user.phoneNumber}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddNewChatPopup;
