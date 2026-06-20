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
  const contacts = snap.docs.map(doc => doc.data());
  console.log(`Analyzing ${contacts.length} contacts assigned to Mishwa...`);

  const fields = ["location", "domain", "course", "track", "regStatus", "teamName", "role", "org"];
  
  fields.forEach(field => {
    const groups: { [val: string]: number } = {};
    contacts.forEach(c => {
      const val = c[field] || "empty/null";
      groups[val] = (groups[val] || 0) + 1;
    });
    
    console.log(`\nGrouping by '${field}':`);
    Object.keys(groups).forEach(val => {
      const count = groups[val];
      if (count === 13) {
        console.log(`  --> EXACTLY 13: "${val}" (Count: ${count})`);
      } else {
        console.log(`  - "${val}": ${count}`);
      }
    });
  });
}

main().catch(console.error);
