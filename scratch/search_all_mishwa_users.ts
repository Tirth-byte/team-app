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

  console.log("=== SEARCHING USERS FOR MISHWA ===");
  const snap = await db.collection("users").get();
  
  snap.docs.forEach(doc => {
    const data = doc.data();
    const email = (data.email || "").toLowerCase();
    const name = (data.name || "").toLowerCase();
    if (email.includes("mishwa") || name.includes("mishwa") || email.includes("marwadi")) {
      console.log(`Match Found in users:`);
      console.log(`- Doc ID (UID): ${doc.id}`);
      console.log(`- Name: ${data.name}`);
      console.log(`- Email: ${data.email}`);
      console.log(`- Role: ${data.role}`);
      console.log(`- CreatedAt:`, data.createdAt ? data.createdAt.toDate() : null);
    }
  });
}

main().catch(console.error);
