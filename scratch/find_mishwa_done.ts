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
  
  const mishwa1 = "A1gwf0ASuBOsbP1kgVDPVlQfbRw1"; // mishwa.hansaliya141744@marwadiuniversity.ac.in
  const mishwa2 = "60IFxhXFXDSivotxX4s3AvON0T33"; // mishwahansaliya@gmail.com

  console.log("=== CHECKING FOR MISHWA CONTACTS ===");

  // Query contacts where assignedTo or waSentBy matches either UID
  const contactsSnap = await db.collection("contacts").get();
  
  let totalAssigned1 = 0;
  let totalSent1 = 0;
  let totalAssigned2 = 0;
  let totalSent2 = 0;
  
  const matchContacts: any[] = [];

  contactsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.assignedTo === mishwa1) totalAssigned1++;
    if (data.waSentBy === mishwa1) totalSent1++;
    if (data.assignedTo === mishwa2) totalAssigned2++;
    if (data.waSentBy === mishwa2) totalSent2++;

    // Let's also check if any field contains mishwa's email or UID
    const dataStr = JSON.stringify(data).toLowerCase();
    if (dataStr.includes("mishwa") || dataStr.includes(mishwa1.toLowerCase()) || dataStr.includes(mishwa2.toLowerCase())) {
      matchContacts.push({ id: doc.id, ...data });
    }
  });

  console.log(`Mishwa University Account (${mishwa1}):`);
  console.log(`- Assigned: ${totalAssigned1}`);
  console.log(`- Sent (waSentBy): ${totalSent1}`);
  
  console.log(`Mishwa Personal Account (${mishwa2}):`);
  console.log(`- Assigned: ${totalAssigned2}`);
  console.log(`- Sent (waSentBy): ${totalSent2}`);

  console.log(`\nContacts matching text search (mishwa/UID): ${matchContacts.length}`);
  matchContacts.forEach(c => {
    console.log(`- ID: ${c.id}, Name: ${c.name}, AssignedTo: ${c.assignedTo}, waSent: ${c.waSent}, waSentBy: ${c.waSentBy}`);
  });
}

main().catch(console.error);
