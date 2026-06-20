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
  const collections = await db.listCollections();
  
  console.log(`Found ${collections.length} collections:`);
  for (const coll of collections) {
    const snap = await coll.limit(5).get();
    console.log(`- Collection name: '${coll.id}' (Total docs: approx/snapshot size: ${snap.size})`);
    if (snap.size > 0) {
      console.log(`  Sample doc fields from first doc (${snap.docs[0].id}):`, Object.keys(snap.docs[0].data()));
    }
  }
}

main().catch(console.error);
