import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Load environment variables from .env.local.
config({ path: ".env.local" });

const EMAIL = "admin@hackathon.com";
const PASSWORD = "Admin@123";
const NAME = "Admin";

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local"
    );
  }

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const auth = getAuth();
  const db = getFirestore();

  // Create the auth user (or reuse + reset password if it already exists).
  let uid: string;
  try {
    const user = await auth.createUser({
      email: EMAIL,
      password: PASSWORD,
      displayName: NAME,
    });
    uid = user.uid;
    console.log(`✓ Created Auth user: ${uid}`);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      const existing = await auth.getUserByEmail(EMAIL);
      uid = existing.uid;
      await auth.updateUser(uid, { password: PASSWORD, displayName: NAME });
      console.log(`✓ Auth user already existed — reused & reset password: ${uid}`);
    } else {
      throw err;
    }
  }

  // Write the Firestore profile with admin role.
  await db.collection("users").doc(uid).set({
    id: uid,
    name: NAME,
    email: EMAIL,
    role: "admin",
    createdAt: new Date(),
  });
  console.log(`✓ Wrote Firestore users/${uid} (role: admin)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Failed to create admin:", err);
    process.exit(1);
  });
