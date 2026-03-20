class ENV {
  static baseUrl = import.meta.env.VITE_BASE_URL;
  static qrValue = import.meta.env.VITE_QRVALUE;
  static fakeToken = import.meta.env.VITE_FAKE_TOKEN;
  static firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  static firebaseAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  static firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  static firebaseStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  static firebaseMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  static firebaseAppId = import.meta.env.VITE_FIREBASE_APP_ID;
  static firebaseMeasurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
}

export default ENV;