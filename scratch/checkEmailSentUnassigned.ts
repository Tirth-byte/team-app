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

  const snap = await db.collection("contacts")
    .where("assignedTo", "==", null)
    .where("emailSent", "==", true)
    .get();

  console.log(`Found ${snap.size} unassigned contacts that have emailSent: true.`);
  
  snap.docs.forEach((doc, idx) => {
    const data = doc.data();
    console.log(`${idx}: ID: ${doc.id}, Name: ${data.name}, Email: ${data.email}, EmailSentAt: ${data.emailSentAt ? data.emailSentAt.toDate().toISOString() : null}`);
  });
}

main().catch(console.error);
