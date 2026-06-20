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
  const contactsSnap = await db.collection("contacts").get();
  
  const allKeys = new Set<string>();
  contactsSnap.docs.forEach(doc => {
    const keys = Object.keys(doc.data());
    keys.forEach(k => allKeys.add(k));
  });

  console.log("All unique keys found in any contact document:", Array.from(allKeys));
}

main().catch(console.error);
