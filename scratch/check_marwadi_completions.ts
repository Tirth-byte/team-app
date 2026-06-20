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

  console.log("=== SEARCHING MARWADI UNIVERSITY COMPLETIONS ===");
  const snap = await db.collection("contacts").where("waSent", "==", true).get();
  
  let matchCount = 0;
  snap.docs.forEach(doc => {
    const data = doc.data();
    const email = (data.email || "").toLowerCase();
    const org = (data.org || "").toLowerCase();
    
    if (email.includes("marwadi") || org.includes("marwadi")) {
      matchCount++;
      console.log(`Match ${matchCount}: ID: ${doc.id} | Name: ${data.name} | Email: ${data.email} | Org: ${data.org} | waSentBy: ${data.waSentBy} | assignedTo: ${data.assignedTo}`);
    }
  });

  console.log(`\nSearch complete. Found ${matchCount} completed contacts from Marwadi University.`);
}

main().catch(console.error);
