import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration is read from environment variables.
// Make sure to set these in your local .env.local file (not committed to git).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Basic safety check so it's easier to notice missing config in development.
if (!firebaseConfig.apiKey || !firebaseConfig.appId) {
  // In production you would usually not throw, but for this portfolio app
  // it makes configuration problems very visible during setup.
  // eslint-disable-next-line no-console
  console.warn(
    "[UniMeal] Firebase config is missing. Did you set NEXT_PUBLIC_FIREBASE_* in .env.local?",
  );
}

// Avoid initializing the app more than once in Next.js (due to hot reload, etc.).
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

