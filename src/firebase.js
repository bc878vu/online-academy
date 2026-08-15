// ======================================================
// FIREBASE APP
// ======================================================

import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// ======================================================
// FIREBASE AUTH
// ======================================================

import { getAuth, GoogleAuthProvider } from "firebase/auth";

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
  throw new Error(`Missing Firebase environment variables: ${missingFirebaseConfig.join(", ")}`);
}

const app = initializeApp(firebaseConfig);

// Optional production abuse protection. Set VITE_RECAPTCHA_V3_SITE_KEY in
// Vercel/Firebase before enabling App Check enforcement in the Firebase console.
// Keeping this optional prevents local/dev builds from breaking when the site
// key has not been configured yet.
const appCheckSiteKey = String(import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY || "").trim();
if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

// Memory cache avoids fragile IndexedDB startup/visibility races while still
// preventing repeated reads during the current page session.
export const db = initializeFirestore(app, { localCache: memoryLocalCache() });
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const storage = getStorage(app);
export default app;
