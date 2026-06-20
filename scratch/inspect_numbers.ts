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

  if (!fs.existsSync(NUMBERS_JSON_PATH)) {
    console.error("Numbers JSON not found.");
    return;
  }
  const visitedNumbers: string[] = JSON.parse(fs.readFileSync(NUMBERS_JSON_PATH, "utf8"));
  console.log("Visited Numbers from browser history:", visitedNumbers);

  const contactsSnap = await db.collection("contacts").where("assignedTo", "==", mishwaUid).get();
  const mishwaMobiles = contactsSnap.docs.map(doc => {
    const d = doc.data();
    return {
      name: d.name,
      mobile: d.mobile,
      raw: (d.mobile || "").replace(/\D/g, ""),
      last10: (d.mobile || "").replace(/\D/g, "").slice(-10)
    };
  });
  console.log("\nMishwa's Assigned Contact Mobiles (first 20):", mishwaMobiles.slice(0, 20));
}

main().catch(console.error);
