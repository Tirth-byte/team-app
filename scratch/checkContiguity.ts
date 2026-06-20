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
  const snap = await db.collection("contacts").get();
  
  const contacts = snap.docs.map(doc => ({
    id: doc.id,
    assignedTo: doc.data().assignedTo || null,
    waSent: doc.data().waSent || false,
    name: doc.data().name,
    email: doc.data().email,
  }));

  // Sort contacts by document ID (alphabetically)
  contacts.sort((a, b) => a.id.localeCompare(b.id));

  // Print contact list sequence: index, docId, assignedTo, waSent
  console.log("First 100 contacts sequence:");
  contacts.slice(0, 100).forEach((c, idx) => {
    console.log(`${idx}: ID: ${c.id}, AssignedTo: ${c.assignedTo}, waSent: ${c.waSent}`);
  });

  // Let's analyze continuous blocks
  console.log("\n=== BLOCKS OF ASSIGNMENTS ===");
  let currentBlock: { assignedTo: string | null; startIdx: number; endIdx: number; count: number } | null = null;

  contacts.forEach((c, idx) => {
    if (!currentBlock) {
      currentBlock = { assignedTo: c.assignedTo, startIdx: idx, endIdx: idx, count: 1 };
    } else if (currentBlock.assignedTo === c.assignedTo) {
      currentBlock.endIdx = idx;
      currentBlock.count++;
    } else {
      console.log(`Block: AssignedTo: ${currentBlock.assignedTo}, Count: ${currentBlock.count}, Range: [${currentBlock.startIdx} - ${currentBlock.endIdx}]`);
      currentBlock = { assignedTo: c.assignedTo, startIdx: idx, endIdx: idx, count: 1 };
    }
  });
  if (currentBlock) {
    console.log(`Block: AssignedTo: ${currentBlock!.assignedTo}, Count: ${currentBlock!.count}, Range: [${currentBlock!.startIdx} - ${currentBlock!.endIdx}]`);
  }
}

main().catch(console.error);
