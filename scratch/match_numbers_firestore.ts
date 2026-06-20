import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

config({ path: ".env.local" });

const NUMBERS_JSON_PATH = "/Users/tirthpatel/Downloads/team-app-main/scratch/visited_wa_numbers.json";

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

  // 1. Read visited numbers
  if (!fs.existsSync(NUMBERS_JSON_PATH)) {
    console.error("Numbers JSON not found.");
    return;
  }
  const visitedNumbers: string[] = JSON.parse(fs.readFileSync(NUMBERS_JSON_PATH, "utf8"));
  console.log(`Loaded ${visitedNumbers.length} visited phone numbers from history.`);

  // Clean visited numbers to get last 10 digits
  const visitedLast10 = visitedNumbers.map(num => num.slice(-10)).filter(num => num.length >= 10);

  // 2. Fetch Mishwa's assigned contacts
  const contactsSnap = await db.collection("contacts").where("assignedTo", "==", mishwaUid).get();
  console.log(`Fetched ${contactsSnap.size} contacts assigned to Mishwa from Firestore.`);

  const matchedDocs: any[] = [];

  contactsSnap.docs.forEach(doc => {
    const d = doc.data();
    const rawMobile = (d.mobile || "").replace(/\D/g, "");
    const last10 = rawMobile.slice(-10);
    
    // Check if the contact's last 10 digits are in the visited list
    if (last10 && last10.length >= 10 && visitedLast10.includes(last10)) {
      matchedDocs.push({
        id: doc.id,
        ref: doc.ref,
        name: d.name,
        email: d.email,
        mobile: d.mobile,
        waSent: d.waSent
      });
    }
  });

  console.log(`\n=== Matched Contacts (${matchedDocs.length}) ===`);
  matchedDocs.forEach((c, idx) => {
    console.log(`${idx + 1}: ID: ${c.id} | Name: ${c.name} | Mobile: ${c.mobile} | waSent: ${c.waSent}`);
  });

  // 3. Ask or perform database update
  if (matchedDocs.length > 0) {
    console.log("\nUpdating matched contacts in database to complete...");
    const batch = db.batch();
    const now = new Date();
    matchedDocs.forEach(c => {
      batch.update(c.ref, {
        waSent: true,
        waSentAt: now,
        waSentBy: mishwaUid,
        whatsappSent: true,
        whatsappSentAt: now,
      });
    });
    await batch.commit();
    console.log(`Successfully updated ${matchedDocs.length} contacts to completed under Mishwa's UID!`);
  } else {
    console.log("No matching contacts to update.");
  }
}

main().catch(console.error);
