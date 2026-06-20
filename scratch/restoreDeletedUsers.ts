import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

const deletedUids = ['sOVpKMFcgHaIHsrqt9wEjkXSMes2', 'A1gwf0ASuBOsbP1kgVDPVlQfbRw1'];

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

  const auth = getAuth();
  const db = getFirestore();

  for (const uid of deletedUids) {
    try {
      const authUser = await auth.getUser(uid);
      console.log(`Found user in Auth: ${uid}`);
      console.log(`Email: ${authUser.email}, Name: ${authUser.displayName}`);

      // Recreate user document in users collection
      await db.collection("users").doc(uid).set({
        id: uid,
        name: authUser.displayName || authUser.email?.split("@")[0] || "Team Member",
        email: authUser.email || "",
        role: "user",
        createdAt: new Date(),
      });
      console.log(`✓ Recreated Firestore user document for ${uid}`);
    } catch (err) {
      console.log(`User ${uid} not found in Auth or failed to restore:`, (err as Error).message);
    }
  }
}

main().catch(console.error);
