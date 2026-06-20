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

  console.log("=== COMPLETED CONTACTS ORDERED BY TIME ===");
  const snap = await db.collection("contacts").where("waSent", "==", true).get();
  
  const completed = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      assignedTo: data.assignedTo,
      waSentBy: data.waSentBy,
      waSentAt: data.waSentAt ? data.waSentAt.toDate() : null,
    };
  });

  // Sort by waSentAt descending (most recent first)
  completed.sort((a, b) => {
    if (!a.waSentAt) return 1;
    if (!b.waSentAt) return -1;
    return b.waSentAt.getTime() - a.waSentAt.getTime();
  });

  console.log(`Total completed contacts: ${completed.length}`);
  console.log("\nTop 50 most recently completed contacts:");
  completed.slice(0, 50).forEach((c, idx) => {
    console.log(`${idx}: ${c.waSentAt ? c.waSentAt.toISOString() : "no time"} | SentBy: ${c.waSentBy} | AssignedTo: ${c.assignedTo} | Name: ${c.name} | Email: ${c.email}`);
  });
}

main().catch(console.error);
