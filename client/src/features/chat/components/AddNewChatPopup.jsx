import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { addChat } from "../store/chatReducer";

const AddNewChatPopup = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");

  const handleAddChat = () => {
  const newChat = {
    id: Date.now(),
    name: "John Doe",
    message: "Start chatting...",
    time: "Now",
  };

  dispatch(addChat(newChat));
  onClose();
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Popup Container */}
      <div className="w-125 max-w-[90%] bg-white rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-semibold">Add New Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-lg"
          >
            ✕
          </button>
        </div>

        {/* Search Box */}
        <input
          type="text"
          placeholder="Search by phone number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Demo User Tile */}
        <div 
        onClick={handleAddChat}
        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition">
          {/* Profile Pic */}
          <img
            src="https://i.pravatar.cc/100"
            alt="profile"
            className="w-12 h-12 rounded-full object-cover"
          />

          {/* User Info */}
          <div>
            <p className="font-medium">John Doe</p>
            <p className="text-sm text-gray-500">+91 9876543210</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddNewChatPopup;
