// Web Push (FCM) registration for the browser client.
//
// What this does once the user is authenticated:
//   1. registers /firebase-messaging-sw.js (background notifications);
//   2. asks for the Notification permission (silently skipped when
//      denied or unsupported);
//   3. obtains an FCM registration token and binds it to this device
//      row on the server, which then pushes for messages that arrive
//      while no socket is connected.
//
// Foreground messages are intentionally not rendered here: while the
// tab is open the Socket.IO connection already delivers messages live
// (chat list badges, toasts), and FCM only completes the offline path.

import { useEffect, useRef } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getMessagingInstance } from "../../core/config/firebaseConfig";
import ENV from "../../core/config/env";
import axiosInstance from "../../core/api/axiosInstance";
import ENDPOINTS from "../../core/api/endpoints";
import useAuth from "../auth/hooks/useAuth";
import generateDeviceDetails from "../../shared/utils/generateDeviceDetails";

const SW_PATH = "/firebase-messaging-sw.js";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH);
  } catch (err) {
    console.error("[push] service worker registration failed:", err);
    return null;
  }
}

export default function usePushNotifications() {
  const { isAuthenticated, user } = useAuth();
  // One registration attempt per session per auth state.
  const attemptedForRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    // Skip in non-browser / test environments.
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (attemptedForRef.current === user.id) return;
    attemptedForRef.current = user.id;

    let cancelled = false;

    const register = async () => {
      // Never enabled without a VAPID key configured.
      if (!ENV.vapidKey) {
        if (import.meta.env.DEV) {
          console.warn(
            "[push] VITE_FIREBASE_VAPID_KEY not set — push disabled",
          );
        }
        return;
      }

      // Already denied? Don't nag on every login.
      if (Notification.permission === "denied") return;

      try {
        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();

        if (cancelled || permission !== "granted") return;

        const registration = await registerServiceWorker();
        if (cancelled || !registration) return;

        const messaging = await getMessagingInstance();
        if (cancelled || !messaging) return;

        const token = await getToken(messaging, {
          vapidKey: ENV.vapidKey,
          serviceWorkerRegistration: registration,
        });
        if (cancelled || !token) return;

        const { deviceId, deviceType } = generateDeviceDetails();

        await axiosInstance.post(ENDPOINTS.NOTIFICATIONS.REGISTER, {
          token,
          deviceId,
          platform: "fcm",
          deviceType,
        });

        // Foreground FCM message: the socket path already renders it;
        // this listener just stops the SDK from warning about
        // unhandled messages.
        onMessage(messaging, () => {});
      } catch (err) {
        if (err?.code === "messaging/permission-blocked") return;
        console.error("[push] registration failed:", err);
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);
}
