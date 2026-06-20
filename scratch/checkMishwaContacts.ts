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
  const uid = "A1gwf0ASuBOsbP1kgVDPVlQfbRw1"; // Mishwa's UID

  const [assignedSnap, sentSnap] = await Promise.all([
    db.collection("contacts").where("assignedTo", "==", uid).get(),
    db.collection("contacts").where("waSentBy", "==", uid).get()
  ]);

  console.log(`Assigned contacts: ${assignedSnap.size}`);
  assignedSnap.docs.forEach(doc => {
    console.log(`Assigned doc ID: ${doc.id}, data:`, doc.data());
  });

  console.log(`Sent contacts (waSentBy): ${sentSnap.size}`);
  sentSnap.docs.forEach(doc => {
    console.log(`Sent doc ID: ${doc.id}, data:`, doc.data());
  });
}

main().catch(console.error);
