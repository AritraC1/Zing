import { X, LogOut, User } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../auth/store/authReducer";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ProfileSetupPage from "../pages/ProfileSetupPage";

const SettingsDialog = ({ open, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get both auth + profile data
  const authUser = useSelector((state) => state.auth.user);
  const profileUser = useSelector((state) => state.profile.user);

  // Prefer updated profile data
  const user = profileUser || authUser;

  const [profilePopupOpen, setProfilePopupOpen] = useState(false);

  if (!open) return null;

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-start">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Dialog */}
        <div className="relative mb-20 ml-6 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-800">Settings</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Profile Section */}
          <div
            onClick={() => {
              onClose(); // ✅ close settings
              setProfilePopupOpen(true);
            }}
            className="flex items-center gap-3 px-4 py-4 border-b cursor-pointer hover:bg-gray-50 transition"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <User size={16} className="text-gray-600" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="leading-tight">
              <p className="text-sm font-medium text-gray-800">
                {user?.name || user?.displayName || "User"}
              </p>
              <p className="text-xs text-gray-500">
                {user?.phoneNumber || "No phone"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 rounded-md hover:bg-red-50 transition"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Profile Popup */}
      <ProfileSetupPage
        isOpen={profilePopupOpen}
        onClose={() => setProfilePopupOpen(false)}
      />
    </>
  );
};

export default SettingsDialog;
