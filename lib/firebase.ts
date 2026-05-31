import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth as getFirebaseAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

function ensureBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error(
      "Firebase can only be initialized in the browser. Make sure this code runs in a client component."
    );
  }
}

/**
 * Lazily initialize (or reuse) the Firebase app. Browser-only.
 */
export function getFirebaseApp(): FirebaseApp {
  ensureBrowser();
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

/**
 * Lazily get the Firebase Auth instance. Browser-only.
 */
export function getAuth(): Auth {
  ensureBrowser();
  if (!auth) {
    auth = getFirebaseAuth(getFirebaseApp());
  }
  return auth;
}

/**
 * Lazily get the Firestore instance. Browser-only.
 */
export function getDb(): Firestore {
  ensureBrowser();
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}
