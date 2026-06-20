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
  console.log("Total contacts in Firestore:", contactsSnap.size);

  const assignedCount: { [uid: string]: number } = {};
  const waSentCount: { [uid: string]: number } = {};
  let totalAssigned = 0;
  let totalSent = 0;

  contactsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.assignedTo) {
      totalAssigned++;
      assignedCount[data.assignedTo] = (assignedCount[data.assignedTo] || 0) + 1;
    }
    if (data.waSent) {
      totalSent++;
      const sentBy = data.waSentBy || "unknown";
      waSentCount[sentBy] = (waSentCount[sentBy] || 0) + 1;
    }
  });

  console.log("Total assigned contacts in DB:", totalAssigned);
  console.log("Assignment distribution by UID:", assignedCount);
  console.log("Total sent (waSent: true) contacts in DB:", totalSent);
  console.log("Sent distribution by UID:", waSentCount);
}

main().catch(console.error);
