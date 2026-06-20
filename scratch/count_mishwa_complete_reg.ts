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
  
  let completeCount = 0;
  let incompleteCount = 0;
  let otherCount = 0;
  
  const completeContacts: any[] = [];

  snap.docs.forEach(doc => {
    const d = doc.data();
    const status = d.regStatus;
    if (status === "Complete") {
      completeCount++;
      completeContacts.push({ id: doc.id, name: d.name, email: d.email, mobile: d.mobile });
    } else if (status === "Incomplete") {
      incompleteCount++;
    } else {
      otherCount++;
    }
  });

  console.log(`Mishwa's Contacts regStatus Summary:`);
  console.log(`- Complete: ${completeCount}`);
  console.log(`- Incomplete: ${incompleteCount}`);
  console.log(`- Other/Empty: ${otherCount}`);
  
  console.log("\nComplete Contacts:");
  completeContacts.forEach((c, idx) => {
    console.log(`${idx + 1}: ID: ${c.id} | Name: ${c.name} | Email: ${c.email}`);
  });
}

main().catch(console.error);
