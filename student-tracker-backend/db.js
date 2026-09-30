const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let firestoreDb = null;
let initStatus = {
  method: 'none',
  success: false,
  error: null,
  timestamp: new Date().toISOString(),
};

function formatPrivateKey(key) {
  if (!key) return key;
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, '\n');
}

function initFirebase() {
  if (admin.apps.length > 0) {
    initStatus.method = 'existing_app';
    initStatus.success = true;
    return admin.firestore();
  }

  // 1. Check local serviceAccountKey.json file
  const localKeyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initStatus.method = 'serviceAccountKey.json';
      initStatus.success = true;
      return admin.firestore();
    } catch (err) {
      initStatus.error = 'serviceAccountKey.json error: ' + err.message;
    }
  }

  // 2. Check FIREBASE_SERVICE_ACCOUNT_KEY (Base64 or JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (
        (rawKey.startsWith('"') && rawKey.endsWith('"')) ||
        (rawKey.startsWith("'") && rawKey.endsWith("'"))
      ) {
        rawKey = rawKey.slice(1, -1);
      }
      if (!rawKey.startsWith('{')) {
        try {
          rawKey = Buffer.from(rawKey, 'base64').toString('utf8');
        } catch (_) {}
      }
      const serviceAccount = JSON.parse(rawKey);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = formatPrivateKey(serviceAccount.private_key);
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initStatus.method = 'FIREBASE_SERVICE_ACCOUNT_KEY';
      initStatus.success = true;
      return admin.firestore();
    } catch (err) {
      initStatus.error = 'FIREBASE_SERVICE_ACCOUNT_KEY error: ' + err.message;
    }
  }

  // 3. Check individual environment variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    try {
      const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID.trim(),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(),
          privateKey: privateKey,
        }),
      });
      initStatus.method = 'individual_env_vars';
      initStatus.success = true;
      return admin.firestore();
    } catch (err) {
      initStatus.error = 'individual_env_vars error: ' + err.message;
    }
  }

  // If no credentials succeeded, do not silently initialize with null credentials
  initStatus.method = 'failed_no_credentials';
  initStatus.success = false;
  initStatus.error =
    initStatus.error ||
    'No valid Firebase credentials found in environment (FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY).';

  return null;
}

try {
  firestoreDb = initFirebase();
} catch (e) {
  initStatus.error = e.message;
}

function getDb() {
  if (!firestoreDb) {
    firestoreDb = initFirebase();
  }
  return firestoreDb;
}

module.exports = {
  getDb,
  getInitStatus: () => initStatus,
};