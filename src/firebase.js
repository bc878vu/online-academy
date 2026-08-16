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
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

// ======================================================
// FIRESTORE
// ======================================================

import { initializeFirestore, memoryLocalCache } from "firebase/firestore";

// ======================================================
// FIREBASE STORAGE
// ======================================================

import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

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

const app = initializeApp(firebaseConfig);

// Keep authentication persistence explicit. This was the stable configuration
// used before the recent admin/authentication updates and avoids auth-session
// regressions across page reloads and popup sign-in flows.
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Firebase persistence setup failed:", error);
});

// Memory cache avoids fragile IndexedDB startup/visibility races while still
// preventing repeated reads during the current page session.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const storage = getStorage(app);
export default app;
