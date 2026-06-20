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

  if (!fs.existsSync(NUMBERS_JSON_PATH)) {
    console.error("Numbers JSON not found.");
    return;
  }
  const visitedNumbers: string[] = JSON.parse(fs.readFileSync(NUMBERS_JSON_PATH, "utf8"));
  const visitedLast10 = visitedNumbers.map(num => num.slice(-10)).filter(num => num.length >= 10);
  console.log(`Loaded ${visitedNumbers.length} visited numbers.`);

  const contactsSnap = await db.collection("contacts").get();
  console.log(`Loaded ${contactsSnap.size} total contacts from Firestore.`);

  let matchCount = 0;
  contactsSnap.docs.forEach((doc, idx) => {
    const d = doc.data();
    const rawMobile = (d.mobile || "").replace(/\D/g, "");
    const last10 = rawMobile.slice(-10);
    
    if (last10 && last10.length >= 10 && visitedLast10.includes(last10)) {
      matchCount++;
      console.log(`Match ${matchCount}: ID: ${doc.id} | Name: ${d.name} | Mobile: ${d.mobile} | waSent: ${d.waSent} | assignedTo: ${d.assignedTo} | waSentBy: ${d.waSentBy}`);
    }
  });

  console.log(`\nMatch search complete. Found ${matchCount} matches in total contacts.`);
}

main().catch(console.error);
