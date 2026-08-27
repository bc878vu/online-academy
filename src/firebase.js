import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Support both naming conventions used by Vercel/Vite deployments.
// VITE_* variables are replaced at build time, so the correct environment
// scope (Production/Preview) must be selected before deploying.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.VITE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.VITE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || env.VITE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.VITE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.VITE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID || env.VITE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || env.VITE_MEASUREMENT_ID,
};

const required = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
const missing = required.filter((key) => !firebaseConfig[key]);
if (missing.length) {
  throw new Error(`Missing Firebase environment variables: ${missing.join(", ")}`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Firebase persistence setup failed:", error);
});

export const db = initializeFirestore(app, { localCache: memoryLocalCache() });
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const storage = getStorage(app);
export default app;
