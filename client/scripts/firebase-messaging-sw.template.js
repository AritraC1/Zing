// Template for public/firebase-messaging-sw.js — Firebase Cloud
// Messaging background service worker.
//
// Placeholder values (__FIREBASE_*__) are replaced by
// scripts/generate-firebase-sw.mjs from your VITE_FIREBASE_* env vars
// before dev/build. The config is public by design (identical to what
// ships in the app bundle).

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
});

const messaging = firebase.messaging();

// Data-only messages (no `notification` payload) land here. Messages
// that carry a `notification` payload are displayed automatically by
// the SDK and never reach this handler.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const senderName = data.senderName || "Zing";
  const body = payload.notification?.body || "New message";

  // tag = one notification per conversation, replacing stale ones.
  self.registration.showNotification(senderName, {
    body,
    tag: data.conversationId || "zing",
    renotify: true,
    data,
  });
});

// Clicking a notification focuses an open Zing tab (or opens one).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow("/");
      }),
  );
});
