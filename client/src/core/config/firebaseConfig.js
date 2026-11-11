// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";
import ENV from "./env";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: ENV.firebaseApiKey,
  authDomain: ENV.firebaseAuthDomain,
  projectId: ENV.firebaseProjectId,
  storageBucket: ENV.firebaseStorageBucket,
  messagingSenderId: ENV.firebaseMessagingSenderId,
  appId: ENV.firebaseAppId,
  measurementId: ENV.firebaseMeasurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app); // <--- Add this line

// Web Push (FCM). Resolves to null in browsers/environments without
// messaging support (no HTTPS, some in-app webviews) — callers must
// guard. Kept as a function so the support check is awaited, not racy.
export async function getMessagingInstance() {
  try {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
  } catch {
    return null;
  }
}

export { app, auth };