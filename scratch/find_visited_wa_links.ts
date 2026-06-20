import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import * as sqlite3 from "sqlite3";

config({ path: ".env.local" });

const HISTORY_PATHS = [
  "/Users/tirthpatel/Library/Application Support/Google/Chrome/Default/History",
  "/Users/tirthpatel/Library/Application Support/BraveSoftware/Brave-Browser/Default/History",
  "/Users/tirthpatel/Library/Application Support/Arc/User Data/Default/History",
  "/Users/tirthpatel/Library/Application Support/Microsoft Edge/Default/History",
  "/Users/tirthpatel/Library/Application Support/com.operasoftware.Opera/History"
];

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

  // 1. Fetch Mishwa's assigned contacts
  const contactsSnap = await db.collection("contacts").where("assignedTo", "==", mishwaUid).get();
  console.log(`Fetched ${contactsSnap.size} contacts assigned to Mishwa.`);

  const mishwaContacts = contactsSnap.docs.map(doc => {
    const d = doc.data();
    const rawMobile = (d.mobile || "").replace(/\D/g, "");
    const last10Digits = rawMobile.slice(-10);
    return {
      id: doc.id,
      name: d.name,
      email: d.email,
      mobile: d.mobile,
      rawMobile,
      last10Digits,
    };
  });

  // 2. Helper to query a single SQLite history DB
  function queryHistoryDB(dbPath: string): Promise<string[]> {
    return new Promise((resolve) => {
      if (!fs.existsSync(dbPath)) {
        resolve([]);
        return;
      }
      
      // Copy history file to a temp file because browser may lock it
      const tempPath = `${dbPath}.temp`;
      try {
        fs.copyFileSync(dbPath, tempPath);
      } catch (err) {
        resolve([]);
        return;
      }

      const sqlDb = new sqlite3.default.Database(tempPath, sqlite3.default.OPEN_READONLY, (err) => {
        if (err) {
          try { fs.unlinkSync(tempPath); } catch {}
          resolve([]);
          return;
        }
      });

      const urls: string[] = [];
      const sql = "SELECT url FROM urls WHERE url LIKE '%wa.me%' OR url LIKE '%whatsapp.com/send%'";
      sqlDb.all(sql, [], (err, rows: any[]) => {
        if (!err && rows) {
          rows.forEach(r => urls.push(r.url));
        }
        sqlDb.close(() => {
          try { fs.unlinkSync(tempPath); } catch {}
          resolve(urls);
        });
      });
    });
  }

  // 3. Search browser history files
  const visitedUrls = new Set<string>();
  for (const hPath of HISTORY_PATHS) {
    const urls = await queryHistoryDB(hPath);
    if (urls.length > 0) {
      console.log(`Found ${urls.length} WhatsApp links in: ${hPath}`);
      urls.forEach(u => visitedUrls.add(u));
    }
  }

  console.log(`\nUnique visited WhatsApp URLs: ${visitedUrls.size}`);

  // 4. Match phone numbers
  const matchedContacts: any[] = [];
  visitedUrls.forEach(url => {
    // Extract numbers from url
    const numbersInUrl = url.replace(/\D/g, "");
    mishwaContacts.forEach(c => {
      if (c.last10Digits && c.last10Digits.length >= 10 && numbersInUrl.includes(c.last10Digits)) {
        matchedContacts.push(c);
      }
    });
  });

  // Deduplicate matched contacts
  const uniqueMatches = Array.from(new Map(matchedContacts.map(c => [c.id, c])).values());

  console.log(`\n=== Matches with Mishwa's Assigned Tasks: ${uniqueMatches.length} ===`);
  uniqueMatches.forEach((c, idx) => {
    console.log(`${idx + 1}: ID: ${c.id} | Name: ${c.name} | Mobile: ${c.mobile} | Email: ${c.email}`);
  });
}

main().catch(console.error);
