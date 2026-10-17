import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

// The SDK is only ever touched from the browser: client components call these
// getters inside effects and event handlers, never during server rendering.
function app(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase non è configurato: copia .env.example in .env.local e inserisci le chiavi del progetto.",
    );
  }
  return getApps().length ? getApp() : initializeApp(config);
}

export const auth = (): Auth => getAuth(app());
export const db = (): Firestore => getFirestore(app());
export const storage = (): FirebaseStorage => getStorage(app());
