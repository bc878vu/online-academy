import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import {
  getFirestore,
} from "firebase/firestore";

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
  appId: firebaseConfig.appId,
};

for (const [key, value] of Object.entries(requiredFirebaseConfig)) {
  if (!value) {
    console.error(
      `Missing Firebase environment variable for: ${key}. Check your .env file and restart Vite.`
    );
  }
}


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);


// ======================================================
// AUTHENTICATION
// ======================================================

export const auth = getAuth(app);


// ======================================================
// AUTH PERSISTENCE
// ======================================================

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Firebase persistence setup failed:", error);
});


// ======================================================
// GOOGLE AUTH
// ======================================================

export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});


// ======================================================
// FIRESTORE
// ======================================================

export const db = getFirestore(app);


// ======================================================
// FIREBASE STORAGE
// ======================================================

export const storage = getStorage(app);


// ======================================================
// DEFAULT EXPORT
// ======================================================

export default app;
