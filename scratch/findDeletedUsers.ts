import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase config in .env.local");
  }

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const db = getFirestore();

  // 1. Get all current users
  const usersSnap = await db.collection("users").get();
  const currentUids = new Set(usersSnap.docs.map(doc => doc.id));
  console.log("Current user UIDs:", Array.from(currentUids));

  // 2. Get all contacts and find unique assignedTo / waSentBy UIDs
  const contactsSnap = await db.collection("contacts").get();
  const assignedUids = new Set<string>();
  const waSentByUids = new Set<string>();

  contactsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.assignedTo) assignedUids.add(data.assignedTo);
    if (data.waSentBy) waSentByUids.add(data.waSentBy);
  });

  console.log("UIDs assigned in contacts:", Array.from(assignedUids));
  console.log("UIDs who sent messages in contacts:", Array.from(waSentByUids));

  // 3. Find UIDs that are in contacts but not in users list
  const allContactUids = new Set([...assignedUids, ...waSentByUids]);
  const deletedUids: string[] = [];
  allContactUids.forEach(uid => {
    if (!currentUids.has(uid)) {
      deletedUids.push(uid);
    }
  });

  console.log("Deleted user UIDs:", deletedUids);
}

main().catch(console.error);
