class ENV {
  // Base url
  static baseUrl = import.meta.env.VITE_BASE_URL;

  // Socket url
  static socketUrl = import.meta.env.VITE_SOCKET_URL;

  // Firebase
  static firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  static firebaseAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  static firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  static firebaseStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  static firebaseMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  static firebaseAppId = import.meta.env.VITE_FIREBASE_APP_ID;
  static firebaseMeasurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

  // Web Push certificate key for FCM getToken() (Firebase console →
  // Project settings → Cloud Messaging → Web Push certificates).
  static vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
}

export default ENV;