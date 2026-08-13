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

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// ======================================================
// FIREBASE STORAGE
// ======================================================

import {
  getStorage,
} from "firebase/storage";

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

// Firestore persistence reduces repeat network reads, improves repeat
// navigation and gives the app a resilient local cache across tabs.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// ======================================================
// FIREBASE AUTH
// ======================================================

export const auth = getAuth(app);

// ======================================================
// AUTH PERSISTENCE
// ======================================================

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Firebase persistence setup failed:", error);
});

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
