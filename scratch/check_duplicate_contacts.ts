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

  // 1. Fetch all contacts
  const contactsSnap = await db.collection("contacts").get();
  console.log(`Total contacts in database: ${contactsSnap.size}`);

  const allContacts = contactsSnap.docs.map(doc => ({
    id: doc.id,
    ref: doc.ref,
    ...doc.data()
  })) as any[];

  // 2. Filter Mishwa's assigned contacts
  const mishwaContacts = allContacts.filter(c => c.assignedTo === mishwaUid);
  console.log(`Mishwa's assigned contacts: ${mishwaContacts.length}`);

  // 3. Filter completed contacts (waSent == true)
  const completedContacts = allContacts.filter(c => c.waSent === true);
  console.log(`Total completed contacts in DB: ${completedContacts.length}`);

  // 4. Find matches
  let duplicateCompletionsCount = 0;
  const matchesToUpdate: any[] = [];

  mishwaContacts.forEach(mc => {
    const mcEmail = (mc.email || "").trim().toLowerCase();
    const mcMobile = (mc.mobile || "").replace(/\D/g, "");
    const mcLast10 = mcMobile.slice(-10);

    // Look for a completed contact with matching email or phone
    const completedMatch = completedContacts.find(cc => {
      const ccEmail = (cc.email || "").trim().toLowerCase();
      const ccMobile = (cc.mobile || "").replace(/\D/g, "");
      const ccLast10 = ccMobile.slice(-10);

      const emailMatch = mcEmail && ccEmail && mcEmail === ccEmail;
      const phoneMatch = mcLast10 && ccLast10 && mcLast10.length >= 10 && mcLast10 === ccLast10;

      return emailMatch || phoneMatch;
    });

    if (completedMatch) {
      duplicateCompletionsCount++;
      console.log(`\nMatch ${duplicateCompletionsCount}:`);
      console.log(`- Mishwa's Pending Task: ID ${mc.id} | Name: ${mc.name} | Email: ${mc.email} | Mobile: ${mc.mobile}`);
      console.log(`- Already Completed Task: ID ${completedMatch.id} | Name: ${completedMatch.name} | Email: ${completedMatch.email} | Mobile: ${completedMatch.mobile} | SentBy: ${completedMatch.waSentBy} | SentAt: ${completedMatch.waSentAt ? completedMatch.waSentAt.toDate() : null}`);
      matchesToUpdate.push({
        pendingRef: mc.ref,
        completedData: completedMatch
      });
    }
  });

  console.log(`\nSummary: Found ${duplicateCompletionsCount} duplicate completions.`);

  // 5. If we found matches, update Mishwa's pending tasks from the completed ones!
  if (matchesToUpdate.length > 0) {
    console.log(`Updating Mishwa's ${matchesToUpdate.length} pending tasks to COMPLETED...`);
    const batch = db.batch();
    matchesToUpdate.forEach(m => {
      batch.update(m.pendingRef, {
        waSent: true,
        waSentAt: m.completedData.waSentAt || new Date(),
        waSentBy: mishwaUid, // Mark as sent by Mishwa since she says she did them!
        whatsappSent: true,
        whatsappSentAt: m.completedData.whatsappSentAt || new Date(),
      });
    });
    await batch.commit();
    console.log("Database successfully updated!");
  } else {
    console.log("No duplicates to update.");
  }
}

main().catch(console.error);
