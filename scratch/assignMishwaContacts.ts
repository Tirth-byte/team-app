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
  const mishwaUid = "A1gwf0ASuBOsbP1kgVDPVlQfbRw1"; // Mishwa's UID

  // Fetch all contacts that are currently unassigned and unsent
  const snap = await db.collection("contacts")
    .where("assignedTo", "==", null)
    .where("waSent", "==", false)
    .get();

  console.log(`Found ${snap.size} unassigned and unsent contacts to re-assign.`);

  if (snap.empty) {
    console.log("No contacts to assign.");
    return;
  }

  const batch = db.batch();
  snap.docs.forEach(doc => {
    batch.update(doc.ref, { assignedTo: mishwaUid });
  });

  await batch.commit();
  console.log(`Successfully re-assigned ${snap.size} contacts to Mishwa (UID: ${mishwaUid}).`);
}

main().catch(console.error);
