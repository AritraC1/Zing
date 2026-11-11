const path = require("path");

// Firebase Admin is required for two things: phone-token verification
// (auth) and push notifications. Both are optional at boot — the server
// must still start (and run tests) when no service-account key is
// present, so initialization is deferred to first use instead of
// calling process.exit() at require time.

const keyPath = path.resolve(
  process.cwd(),
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    "./core/config/firebase/serviceAccountKey.json",
);

let adminInstance = null;
let loadAttempted = false;

function getFirebaseAdmin() {
  if (loadAttempted) return adminInstance;
  loadAttempted = true;

  try {
    // eslint-disable-next-line global-require
    const admin = require("firebase-admin");
    const serviceAccount = require(keyPath);

    if (!adminInstance) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      adminInstance = admin;
    }
    return adminInstance;
  } catch (e) {
    console.error(
      "Firebase Admin unavailable (push + OTP verification disabled):",
      e.message,
    );
    adminInstance = null;
    return null;
  }
}

function isFirebaseAdminAvailable() {
  return getFirebaseAdmin() !== null;
}

module.exports = { getFirebaseAdmin, isFirebaseAdminAvailable };
