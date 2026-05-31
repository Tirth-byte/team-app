import "server-only";
import {
  type App,
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";

/** Lazily initialize (or reuse) the Firebase Admin app. Server-only. */
function getAdminApp(): App {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The private key is stored with escaped newlines in .env.local.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/**
 * Verify the bearer token on a request and ensure the caller is an admin.
 * Returns the caller's uid on success, or null if unauthorized/forbidden.
 */
export async function verifyAdmin(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const snap = await getAdminDb().collection("users").doc(decoded.uid).get();
    if (snap.data()?.role !== "admin") return null;
    return decoded.uid;
  } catch {
    return null;
  }
}
