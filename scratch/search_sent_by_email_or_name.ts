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

  console.log("=== SEARCHING COMPLETED CONTACTS FOR MISHWA ===");
  const snap = await db.collection("contacts").where("waSent", "==", true).get();
  console.log(`Total completed contacts (waSent: true) in DB: ${snap.size}`);

  let matchCount = 0;
  snap.docs.forEach(doc => {
    const data = doc.data();
    const waSentBy = data.waSentBy || "";
    const waSentByStr = String(waSentBy).toLowerCase();
    
    // Check if the waSentBy contains any of our target terms
    if (
      waSentByStr.includes("mishwa") ||
      waSentByStr.includes("hansaliya") ||
      waSentByStr.includes("hansiya") ||
      waSentByStr.includes("marwadi") ||
      waSentByStr.includes("A1gwf0ASuBOsbP1kgVDPVlQfbRw1".toLowerCase()) ||
      waSentByStr.includes("60IFxhXFXDSivotxX4s3AvON0T33".toLowerCase())
    ) {
      matchCount++;
      console.log(`Match Found:`);
      console.log(`- Contact ID: ${doc.id}`);
      console.log(`- Contact Name: ${data.name}`);
      console.log(`- Contact Email: ${data.email}`);
      console.log(`- waSentBy value: "${waSentBy}"`);
      console.log(`- assignedTo: "${data.assignedTo}"`);
      console.log(`- waSentAt:`, data.waSentAt ? data.waSentAt.toDate() : null);
    }
  });

  console.log(`\nSearch complete. Found ${matchCount} matches in completed contacts.`);
}

main().catch(console.error);
