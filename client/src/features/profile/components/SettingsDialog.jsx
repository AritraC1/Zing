import { useEffect, useState } from "react";
import { X, LogOut, User } from "lucide-react";
import { logout } from "../../auth/store/authReducer";
import { logoutThunk } from "../../auth/api/authThunk";
import { resetChat } from "../../chat/store/chatReducer";
import { persistor } from "../../../store/store";
import { useNavigate } from "react-router-dom";
import UpdateProfileModal from "./UpdateProfileModal";
import { useDispatch, useSelector } from "react-redux";

const SettingsDialog = ({ open, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setProfilePopupOpen(false);
    }
  }, [open]);

  const handleClose = () => {
    setProfilePopupOpen(false);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutThunk()).unwrap();
    } catch {
      // proceed with local cleanup even if server logout fails
    } finally {
      dispatch(logout());
      dispatch(resetChat());
      await persistor.purge();
      navigate("/");
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-start">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div
            className="relative mb-20 ml-3 w-60 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "#1a2332",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
                onClick={handleClose}
                className="p-1 rounded-lg transition"
                style={{ color: "#6b7280" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <X size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setProfilePopupOpen(true)}
              className="flex items-center gap-3 px-4 py-3 w-full cursor-pointer transition text-left"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: "#374151" }}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <User size={16} style={{ color: "#9ca3af" }} />
                  </div>
                )}
              </div>

              <div className="leading-tight min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "#f9fafb" }}
                >
                  {user?.displayName || "User"}
                </p>
                <p className="text-xs truncate" style={{ color: "#6b7280" }}>
                  {user?.phoneNumber || "No phone"}
                </p>
              </div>
            </button>

            <div className="p-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition"
                style={{ color: "#f87171" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <UpdateProfileModal
        isOpen={profilePopupOpen}
        onClose={() => setProfilePopupOpen(false)}
      />
    </>
  );
};

export default SettingsDialog;
