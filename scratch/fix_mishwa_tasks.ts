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
  const mishwaUid = "A1gwf0ASuBOsbP1kgVDPVlQfbRw1";

  // 1. Fetch Mishwa's contacts
  const snap = await db.collection("contacts").where("assignedTo", "==", mishwaUid).get();
  console.log(`Fetched ${snap.size} contacts assigned to Mishwa.`);

  const batch = db.batch();
  const now = new Date();

  let pendingCount = 0;
  let completedCount = 0;

  snap.docs.forEach(doc => {
    const d = doc.data();
    if (d.track === "{Healthcare}") {
      // These 13 should be pending
      pendingCount++;
      batch.update(doc.ref, {
        waSent: false,
        waSentAt: null,
        waSentBy: null,
        whatsappSent: false,
        whatsappSentAt: null,
      });
    } else {
      // The other 53 should be completed
      completedCount++;
      batch.update(doc.ref, {
        waSent: true,
        waSentAt: now,
        waSentBy: mishwaUid,
        whatsappSent: true,
        whatsappSentAt: now,
      });
    }
  });

  console.log(`Updating database: Setting ${pendingCount} tasks to PENDING and ${completedCount} tasks to COMPLETED...`);
  await batch.commit();
  console.log("Database update successfully completed!");
}

main().catch(console.error);
