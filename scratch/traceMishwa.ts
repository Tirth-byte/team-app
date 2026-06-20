import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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
  const auth = getAuth();

  // 1. List all users in Firestore
  console.log("=== FIRESTORE USERS ===");
  const usersSnap = await db.collection("users").get();
  usersSnap.docs.forEach(doc => {
    console.log(`ID: ${doc.id}, Email: ${doc.data().email}, Name: ${doc.data().name}, Role: ${doc.data().role}`);
  });

  // 2. Search for any users in Auth (list first 1000)
  console.log("\n=== AUTH USERS ===");
  const authUsersResult = await auth.listUsers(1000);
  authUsersResult.users.forEach(user => {
    console.log(`UID: ${user.uid}, Email: ${user.email}, Name: ${user.displayName}`);
  });

  // 3. Inspect 'events' collection
  console.log("\n=== EVENTS COLLECTION (First 10) ===");
  const eventsSnap = await db.collection("events").limit(10).get();
  eventsSnap.docs.forEach(doc => {
    console.log(`Event ID: ${doc.id}`, doc.data());
  });
}

main().catch(console.error);
