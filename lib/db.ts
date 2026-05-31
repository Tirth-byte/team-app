import {
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "./firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Contact {
  id: string;
  name: string;
  email: string;
  mobile: string;
  teamName: string;
  role: string;
  org: string;
  regStatus: string;
  assignedTo: string | null;
  waSent: boolean;
  waSentAt: Date | null;
  waSentBy: string | null;
  importedAt: Date;
}

export interface AppUser {
  id: string; // Firebase Auth uid
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: Date;
}

export interface Template {
  waMessage: string;
  updatedAt: Date;
}

export interface UserStats {
  uid: string;
  name: string;
  email: string;
  assigned: number;
  sent: number;
}

// ---------------------------------------------------------------------------
// Collection / document names
// ---------------------------------------------------------------------------

const CONTACTS = "contacts";
const USERS = "users";
const SETTINGS = "settings";
const TEMPLATES_DOC = "templates";

// Firestore caps each batch at 500 writes.
const BATCH_LIMIT = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Firestore Timestamp (or value) to a JS Date, or null. */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function mapContact(
  snapshot: QueryDocumentSnapshot<DocumentData>
): Contact {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name ?? "",
    email: data.email ?? "",
    mobile: data.mobile ?? "",
    teamName: data.teamName ?? "",
    role: data.role ?? "",
    org: data.org ?? "",
    regStatus: data.regStatus ?? "",
    assignedTo: data.assignedTo ?? null,
    waSent: data.waSent ?? false,
    waSentAt: toDate(data.waSentAt),
    waSentBy: data.waSentBy ?? null,
    importedAt: toDate(data.importedAt) ?? new Date(0),
  };
}

function mapUser(snapshot: QueryDocumentSnapshot<DocumentData>): AppUser {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name ?? "",
    email: data.email ?? "",
    role: (data.role as AppUser["role"]) ?? "user",
    createdAt: toDate(data.createdAt) ?? new Date(0),
  };
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

/** Fetch all contacts. */
export async function getContacts(): Promise<Contact[]> {
  const snapshot = await getDocs(collection(getDb(), CONTACTS));
  return snapshot.docs.map(mapContact);
}

/** Fetch the contacts assigned to a given user. */
export async function getContactsByUser(uid: string): Promise<Contact[]> {
  const q = query(
    collection(getDb(), CONTACTS),
    where("assignedTo", "==", uid)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapContact);
}

/** Mark a contact's WhatsApp message as sent by a user. */
export function updateContactWaSent(id: string, uid: string): Promise<void> {
  return updateDoc(doc(getDb(), CONTACTS, id), {
    waSent: true,
    waSentAt: new Date(),
    waSentBy: uid,
  });
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** Fetch all users with role "user". */
export async function getUsers(): Promise<AppUser[]> {
  const q = query(collection(getDb(), USERS), where("role", "==", "user"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapUser);
}

// ---------------------------------------------------------------------------
// Realtime subscriptions
// ---------------------------------------------------------------------------

/** Subscribe to all contacts. Returns an unsubscribe function. */
export function subscribeContacts(
  callback: (contacts: Contact[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(getDb(), CONTACTS),
    (snapshot) => callback(snapshot.docs.map(mapContact)),
    (error) => onError?.(error)
  );
}

/** Subscribe to the contacts assigned to a user. Returns an unsubscribe function. */
export function subscribeContactsByUser(
  uid: string,
  callback: (contacts: Contact[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(getDb(), CONTACTS),
    where("assignedTo", "==", uid)
  );
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(mapContact)),
    (error) => onError?.(error)
  );
}

/** Subscribe to all users with role "user". Returns an unsubscribe function. */
export function subscribeUsers(
  callback: (users: AppUser[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(getDb(), USERS), where("role", "==", "user"));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(mapUser)),
    (error) => onError?.(error)
  );
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

/**
 * Distribute the given contacts evenly across the given users (round-robin).
 * Updates each contact's `assignedTo` field.
 */
export async function assignContacts(
  userIds: string[],
  contactIds: string[]
): Promise<void> {
  if (userIds.length === 0 || contactIds.length === 0) return;

  const db = getDb();
  let batch = writeBatch(db);
  let opsInBatch = 0;

  for (let i = 0; i < contactIds.length; i++) {
    const assignedTo = userIds[i % userIds.length];
    batch.update(doc(db, CONTACTS, contactIds[i]), { assignedTo });
    opsInBatch++;

    if (opsInBatch === BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }
}

// ---------------------------------------------------------------------------
// Template (settings/templates)
// ---------------------------------------------------------------------------

/** Fetch the WhatsApp message template. Returns null if not set. */
export async function getTemplate(): Promise<Template | null> {
  const snapshot = await getDoc(doc(getDb(), SETTINGS, TEMPLATES_DOC));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    waMessage: data.waMessage ?? "",
    updatedAt: toDate(data.updatedAt) ?? new Date(0),
  };
}

/** Save (create or overwrite) the WhatsApp message template. */
export function saveTemplate(message: string): Promise<void> {
  return setDoc(doc(getDb(), SETTINGS, TEMPLATES_DOC), {
    waMessage: message,
    updatedAt: new Date(),
  });
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/** Stats for a single user: how many contacts are assigned and sent. */
export async function getUserStats(
  uid: string
): Promise<{ assigned: number; sent: number }> {
  const contacts = await getContactsByUser(uid);
  const sent = contacts.reduce((count, c) => count + (c.waSent ? 1 : 0), 0);
  return { assigned: contacts.length, sent };
}

/** Stats for every user (role "user"). */
export async function getAllUserStats(): Promise<UserStats[]> {
  const [users, contacts] = await Promise.all([getUsers(), getContacts()]);

  return users.map((user) => {
    const assigned = contacts.filter((c) => c.assignedTo === user.id);
    const sent = assigned.reduce((count, c) => count + (c.waSent ? 1 : 0), 0);
    return {
      uid: user.id,
      name: user.name,
      email: user.email,
      assigned: assigned.length,
      sent,
    };
  });
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Batch-import contact rows. Deduplicates by email — rows whose email already
 * exists (in the database or earlier in the same import) are skipped.
 * Returns the number of contacts actually imported.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importContacts(rows: any[]): Promise<number> {
  if (!rows || rows.length === 0) return 0;

  const db = getDb();

  // Build the set of emails that already exist.
  const existing = await getContacts();
  const seen = new Set(
    existing
      .map((c) => c.email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  );

  const now = new Date();
  let batch = writeBatch(db);
  let opsInBatch = 0;
  let imported = 0;

  for (const row of rows) {
    const email = String(row.email ?? "").trim();
    const key = email.toLowerCase();

    // Skip rows with no email or a duplicate email.
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const ref = doc(collection(db, CONTACTS));
    batch.set(ref, {
      name: String(row.name ?? ""),
      email,
      mobile: String(row.mobile ?? ""),
      teamName: String(row.teamName ?? ""),
      role: String(row.role ?? ""),
      org: String(row.org ?? ""),
      regStatus: String(row.regStatus ?? ""),
      assignedTo: null,
      waSent: false,
      waSentAt: null,
      waSentBy: null,
      importedAt: now,
    });

    imported++;
    opsInBatch++;

    if (opsInBatch === BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  return imported;
}
