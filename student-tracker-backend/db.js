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
  let cleaned = String(key).trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\r/g, '').replace(/\\n/g, '\n');
}

function initFirebase() {
  if (admin.apps.length > 0) {
    initStatus.method = 'existing_app';
    initStatus.success = true;
    return admin.firestore();
  }

  // 1. Check FIREBASE_SERVICE_ACCOUNT_KEY from Vercel Environment Variables
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
        projectId: serviceAccount.project_id || 'ai-student-tracker-stem',
      });
      initStatus.method = 'FIREBASE_SERVICE_ACCOUNT_KEY';
      initStatus.success = true;
      const db = admin.firestore();
      db.settings({ ignoreUndefinedProperties: true });
      return db;
    } catch (err) {
      initStatus.error = 'FIREBASE_SERVICE_ACCOUNT_KEY error: ' + err.message;
    }
  }

  initStatus.method = 'failed_no_credentials';
  initStatus.success = false;
  initStatus.error = 'No valid Firebase credentials found in environment.';
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
