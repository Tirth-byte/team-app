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
    .where("waSent", "==", false)
    .get();

  console.log(`Found ${snap.size} unassigned and unsent contacts.`);

  const list = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      importedAt: data.importedAt ? data.importedAt.toDate().toISOString() : null,
      course: data.course,
      track: data.track,
    };
  });

  // Sort them by importedAt (if available) or by id/email
  list.sort((a, b) => {
    if (a.importedAt && b.importedAt) {
      return a.importedAt.localeCompare(b.importedAt);
    }
    return a.id.localeCompare(b.id);
  });

  console.log("First 10 unassigned/unsent contacts:");
  console.log(list.slice(0, 10));

  console.log("Last 10 unassigned/unsent contacts:");
  console.log(list.slice(-10));
}

main().catch(console.error);
