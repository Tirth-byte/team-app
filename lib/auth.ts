import {
  type User,
  type UserCredential,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getAuth } from "./firebase";

/**
 * Sign in with an email/password pair.
 */
export function login(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(getAuth(), email, password);
}

/**
 * Sign the current user out.
 */
export function logout(): Promise<void> {
  return firebaseSignOut(getAuth());
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 */
export function onAuthStateChanged(
  callback: (user: User | null) => void
): () => void {
  return firebaseOnAuthStateChanged(getAuth(), callback);
}

/**
 * The currently signed-in user, or null.
 */
export function getCurrentUser(): User | null {
  return getAuth().currentUser;
}
