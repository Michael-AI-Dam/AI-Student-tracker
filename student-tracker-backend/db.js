const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let firestoreDb = null;

function getDb() {
  if (firestoreDb) {
    return firestoreDb;
  }

  if (admin.apps.length > 0) {
    firestoreDb = admin.firestore();
    return firestoreDb;
  }

  // 1. Check for local serviceAccountKey.json file
  const localKeyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase initialized using local serviceAccountKey.json');
      firestoreDb = admin.firestore();
      return firestoreDb;
    } catch (err) {
      console.error('Error reading serviceAccountKey.json:', err.message);
    }
  }

  // 2. Check for FIREBASE_SERVICE_ACCOUNT_KEY (full JSON string or Base64)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (!rawKey.startsWith('{')) {
        rawKey = Buffer.from(rawKey, 'base64').toString('utf8');
      }
      const serviceAccount = JSON.parse(rawKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase initialized using FIREBASE_SERVICE_ACCOUNT_KEY');
      firestoreDb = admin.firestore();
      return firestoreDb;
    } catch (err) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
    }
  }

  // 3. Check for individual environment variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('Firebase initialized using individual FIREBASE_* env variables');
      firestoreDb = admin.firestore();
      return firestoreDb;
    } catch (err) {
      console.error('Error initializing Firebase with individual env variables:', err.message);
    }
  }

  // 4. Default Application Credentials (GCP environment)
  try {
    admin.initializeApp();
    console.log('Firebase initialized with Google default credentials');
    firestoreDb = admin.firestore();
    return firestoreDb;
  } catch (err) {
    console.warn(
      '⚠️ Firebase credentials not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or provide serviceAccountKey.json'
    );
  }

  try {
    firestoreDb = admin.firestore();
    return firestoreDb;
  } catch (e) {
    console.error('Firestore initialization failed:', e.message);
    throw new Error('Firestore not initialized. Please configure Firebase credentials.');
  }
}

module.exports = getDb();