const admin = require("firebase-admin");

let serviceAccount;

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./config/firebase/serviceAccountKey.json";
try {
  serviceAccount = require(keyPath);
} catch (e) {
  console.error("Firebase service account key not found at:", keyPath);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;