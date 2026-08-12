import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
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
  apiKey: "AIzaSyBP7ojqfIaVFKV4W6zhsgUc4RKzoVY-1-o",
  authDomain:
    "online-academy-c7d72.firebaseapp.com",
  projectId:
    "online-academy-c7d72",
  storageBucket:
    "online-academy-c7d72.firebasestorage.app",
  messagingSenderId:
    "768727735008",
  appId:
    "1:768727735008:web:f072001fa6ad20d8ff0e85",
  measurementId:
    "G-760K4C8F5G",
};


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = initializeApp(
  firebaseConfig
);


// ======================================================
// AUTHENTICATION
// ======================================================

export const auth =
  getAuth(app);


// ======================================================
// GOOGLE AUTH
// ======================================================

export const googleProvider =
  new GoogleAuthProvider();


// ======================================================
// FIRESTORE
// ======================================================

export const db =
  getFirestore(app);


// ======================================================
// FIREBASE STORAGE
// ======================================================

export const storage =
  getStorage(app);


// ======================================================
// DEFAULT EXPORT
// ======================================================

export default app;