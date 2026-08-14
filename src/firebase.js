// ======================================================
// FIREBASE APP
// ======================================================

import { initializeApp } from "firebase/app";

// ======================================================
// FIREBASE AUTH
// ======================================================

import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

// ======================================================
// FIRESTORE
// ======================================================

import {
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";

// ======================================================
// FIREBASE STORAGE
// ======================================================

import { getStorage } from "firebase/storage";

// ======================================================
// FIREBASE CONFIGURATION
// ======================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ======================================================
// CONFIG VALIDATION
// ======================================================

const requiredFirebaseConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
};

const missingFirebaseConfig = Object.entries(requiredFirebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingFirebaseConfig.join(", ")}`
  );
}

// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);

// IMPORTANT:
// Do not force IndexedDB persistence here. Chrome's mobile/device emulation,
// hidden tabs, private browsing and some storage environments can close the
// IndexedDB database while Firebase is changing auth state. That can leave
// the whole React app stuck on its auth loader with:
// "Database is closing/hidden".
//
// Memory cache keeps Firestore stable and still avoids duplicate reads during
// the current page session. Server-side Firestore data remains unchanged.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

// ======================================================
// FIREBASE AUTH
// ======================================================

// Firebase Auth uses its normal browser persistence automatically. We do not
// call setPersistence() during module startup because doing so can race with
// a browser tab/storage transition and produce an uncaught IndexedDB error.
export const auth = getAuth(app);

// ======================================================
// GOOGLE AUTH PROVIDER
// ======================================================

export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

// ======================================================
// FIREBASE STORAGE
// ======================================================

export const storage = getStorage(app);

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default app;
