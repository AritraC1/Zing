import { X, LogOut, User } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../auth/store/authReducer";
import { useNavigate } from "react-router-dom";
// import { useState } from "react";
// import UpdateProfileModal from "./UpdateProfileModal";

const SettingsDialog = ({ open, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get both auth + profile data
  const user = useSelector((state) => state.auth.user);

  // const [profilePopupOpen, setProfilePopupOpen] = useState(false);

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
        <div
          className="relative mb-20 ml-3 w-60 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "#1a2332", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <h2
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#9ca3af" }}
            >
              SETTINGS
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg transition"
              style={{ color: "#6b7280" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Profile Section */}
          <div
            onClick={() => {
              onClose(); // close settings
              // setProfilePopupOpen(true);
            }}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
              style={{ background: "#374151" }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <User size={16} style={{ color: "#9ca3af" }} />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="leading-tight min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "#f9fafb" }}>
                {user?.display_name || "User"}
              </p>
              <p className="text-xs truncate" style={{ color: "#6b7280" }}>
                {user?.phone_number || "No phone"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition"
              style={{ color: "#f87171" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Profile Popup */}
      {/* <UpdateProfileModal
        isOpen={profilePopupOpen}
        onClose={() => setProfilePopupOpen(false)}
      /> */}
    </>
  );
};

export default SettingsDialog;