import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, ArrowLeft, Search, UserPlus } from "lucide-react";
import { addChat, selectChat } from "../../chat/store/chatReducer";
import { createOrFindChat } from "../../chat/api/chatThunk";
import { searchUserThunk } from "../api/usersThunk";
import { clearUser } from "../store/usersReducer";

const AddNewChatPopup = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");

  const { user, loading, error } = useSelector((state) => state.users);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (search.trim().length >= 6) {
        dispatch(searchUserThunk({ phoneNumber: search.trim() }));
      } else {
        dispatch(clearUser());
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [search, dispatch]);

  const handleAddChat = async (user) => {
    try {
      const resultAction = await dispatch(createOrFindChat(user.id));

      if (createOrFindChat.fulfilled.match(resultAction)) {
        const { conversationId } = resultAction.payload;
        const name =
          user.name || user.displayName || user.phoneNumber || "Chat";

        const newChat = {
          id: conversationId,
          name,
          phoneNumber: user.phoneNumber,
          message: "Start chatting...",
          time: "Now",
        };

        dispatch(addChat(newChat));
        dispatch(selectChat(newChat));
        handleClose();
      } else {
        throw resultAction.payload || "Unable to create chat";
      }
    } catch (err) {
      console.error("Add chat failed", err);
    }
  };

  const handleClose = () => {
    setSearch("");
    dispatch(clearUser());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-bold text-teal-600">New Chat</h1>
          </div>

          {/* Search */}
          <div className="relative w-80">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search contacts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-gray-100 text-gray-700 outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl w-full mx-auto">
          {/* New Group + New Community cards */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            <div className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm cursor-pointer hover:shadow-md transition">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "#e6f7f3" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="8" r="3" fill="#00c896" />
                  <circle cx="15" cy="8" r="3" fill="#00a87e" />
                  <path
                    d="M3 19c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6"
                    stroke="#00c896"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">New Group</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Create a space for your team
                </p>
              </div>
            </div>
          </div>

          {/* States */}
          {loading && (
            <p className="text-sm text-gray-400 text-center py-4">
              Searching...
            </p>
          )}

          {error && (
            <p className="text-sm text-red-400 text-center py-4">
              {typeof error === "string"
                ? error
                : error?.message || "Something went wrong"}
            </p>
          )}

          {!loading && !error && search.trim().length >= 6 && !user && (
            <p className="text-sm text-gray-400 text-center py-4">
              No user found
            </p>
          )}

          {/* Search Result */}
          {user && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-bold text-gray-200">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                <div
                  onClick={() => handleAddChat(user)}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  {user.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt="profile"
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {user.phoneNumber}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Default contacts placeholder — shown when no search */}
          {!search && !user && (
            <div className="text-center py-12 text-gray-300">
              <Search size={32} className="mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400">
                Search by phone number
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Enter at least 6 digits to find a contact
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddNewChatPopup;
