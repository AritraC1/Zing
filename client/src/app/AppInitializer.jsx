import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getMyDetailsThunk } from "../features/profile/api/profileThunk";
import { refreshAccessTokenThunk } from "../features/auth/api/authThunk";
import usePushNotifications from "../features/notifications/usePushNotifications";

const AppInitializer = ({ children }) => {
  const dispatch = useDispatch();

  // Web Push (FCM): registers the service worker and token once the
  // user is authenticated. No-op when unsupported or denied.
  usePushNotifications();

  useEffect(() => {
    const init = async () => {
      try {
        // First try to refresh - always, on every app load
        await dispatch(refreshAccessTokenThunk()).unwrap();
      } catch {
        // Refresh failed — user needs to log in
      } finally {
        // Then fetch user details with the fresh token
        dispatch(getMyDetailsThunk());
      }
    };

    init();
  }, [dispatch]);

  return children;
};

export default AppInitializer;
