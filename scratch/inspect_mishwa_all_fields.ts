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

  const snap = await db.collection("contacts").where("assignedTo", "==", mishwaUid).get();
  console.log(`Inspecting all fields of the ${snap.size} contacts assigned to Mishwa...`);

  snap.docs.forEach((doc, idx) => {
    const data = doc.data();
    // Check if any field looks like it was processed or sent
    const nonTrivialFields: string[] = [];
    Object.keys(data).forEach(k => {
      const val = data[k];
      if (k.toLowerCase().includes("sent") || k.toLowerCase().includes("time") || k.toLowerCase().includes("date") || k.toLowerCase().includes("status") || k.toLowerCase().includes("by")) {
        if (val !== null && val !== undefined && val !== false && val !== "") {
          nonTrivialFields.push(`${k}: ${JSON.stringify(val)}`);
        }
      }
    });
    if (nonTrivialFields.length > 0) {
      console.log(`Contact [${idx}]: Name: ${data.name}, Email: ${data.email}`);
      console.log(`  Processed fields:`, nonTrivialFields);
    }
  });
}

main().catch(console.error);
