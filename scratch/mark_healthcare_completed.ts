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

  // Fetch all contacts assigned to Mishwa
  const snap = await db.collection("contacts").where("assignedTo", "==", mishwaUid).get();
  
  const healthcareContacts: any[] = [];
  snap.docs.forEach(doc => {
    const d = doc.data();
    if (d.track === "{Healthcare}") {
      healthcareContacts.push({
        id: doc.id,
        ref: doc.ref,
        name: d.name,
        email: d.email,
        mobile: d.mobile,
        track: d.track,
      });
    }
  });

  console.log(`=== Matches Found in {Healthcare} Track: ${healthcareContacts.length} ===`);
  healthcareContacts.forEach((c, idx) => {
    console.log(`${idx + 1}: ID: ${c.id} | Name: ${c.name} | Email: ${c.email} | Mobile: ${c.mobile}`);
  });

  if (healthcareContacts.length === 13) {
    console.log("\nUpdating these 13 contacts in database to COMPLETED...");
    const batch = db.batch();
    const now = new Date();
    healthcareContacts.forEach(c => {
      batch.update(c.ref, {
        waSent: true,
        waSentAt: now,
        waSentBy: mishwaUid,
        whatsappSent: true,
        whatsappSentAt: now,
      });
    });
    await batch.commit();
    console.log("Database updated successfully! All 13 tasks marked complete.");
  } else {
    console.log("Error: Expected exactly 13 healthcare contacts but found a different count.");
  }
}

main().catch(console.error);
