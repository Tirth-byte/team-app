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

  // Get all contacts assigned to Mishwa
  const assignedSnap = await db.collection("contacts").where("assignedTo", "==", mishwaUid).get();
  console.log(`=== Mishwa's Assigned Tasks (${assignedSnap.size}) ===`);
  
  let doneCount = 0;
  let notDoneCount = 0;

  assignedSnap.docs.forEach((doc, idx) => {
    const data = doc.data();
    const waSent = data.waSent ?? data.whatsappSent ?? false;
    if (waSent) {
      doneCount++;
      console.log(`- DONE Task: ID ${doc.id}, Name: ${data.name}, Email: ${data.email}, waSentBy: ${data.waSentBy}, waSentAt: ${data.waSentAt ? data.waSentAt.toDate().toISOString() : null}`);
    } else {
      notDoneCount++;
    }
  });

  console.log(`Summary: Done=${doneCount}, Pending/NotDone=${notDoneCount}`);

  // Let's also check if there are contacts where waSentBy is MishwaUid but assignedTo is different
  const sentSnap = await db.collection("contacts").where("waSentBy", "==", mishwaUid).get();
  console.log(`\n=== Tasks Sent By Mishwa but maybe not assigned to her (${sentSnap.size}) ===`);
  sentSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}, Name: ${data.name}, AssignedTo: ${data.assignedTo}, waSent: ${data.waSent}`);
  });

  // Let's print the first 15 assigned tasks so we can inspect their structure
  console.log("\n=== First 15 Assigned Tasks ===");
  assignedSnap.docs.slice(0, 15).forEach((doc, idx) => {
    const data = doc.data();
    console.log(`${idx}: ID: ${doc.id}, Name: ${data.name}, Email: ${data.email}, Mobile: ${data.mobile}, waSent: ${data.waSent}, waSentBy: ${data.waSentBy}, assignedTo: ${data.assignedTo}`);
  });
}

main().catch(console.error);
