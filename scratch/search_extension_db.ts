import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

config({ path: ".env.local" });

const EXTENSION_DB_DIR = "/Users/tirthpatel/Library/Application Support/Google/Chrome/Default/IndexedDB/chrome-extension_ppmcbemphmekpnpbddecgkbemenginpf_0.indexeddb.leveldb";
const EXTENSION_BLOB_DIR = "/Users/tirthpatel/Library/Application Support/Google/Chrome/Default/IndexedDB/chrome-extension_ppmcbemphmekpnpbddecgkbemenginpf_0.indexeddb.blob";

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
  const snap = await db.collection("contacts").where("assignedTo", "==", mishwaUid).get();
  console.log(`Fetched ${snap.size} contacts assigned to Mishwa from Firestore.`);

  const targets = snap.docs.map(doc => {
    const d = doc.data();
    const email = (d.email || "").trim().toLowerCase();
    const rawMobile = (d.mobile || "").replace(/\D/g, ""); // raw digits
    const last10Digits = rawMobile.slice(-10); // last 10 digits
    return {
      id: doc.id,
      name: d.name,
      email,
      mobile: d.mobile,
      rawMobile,
      last10Digits,
    };
  });

  // 2. Helper to search directories
  const matches: any[] = [];

  function searchInFile(filePath: string) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(filePath);
        for (const f of files) {
          searchInFile(path.join(filePath, f));
        }
        return;
      }
      
      if (stats.size > 50 * 1024 * 1024) return; // Skip files > 50MB
      const content = fs.readFileSync(filePath);
      const contentStr = content.toString("utf8").toLowerCase();
      
      for (const t of targets) {
        let matched = false;
        let matchTerm = "";
        
        if (t.email && contentStr.includes(t.email)) {
          matched = true;
          matchTerm = t.email;
        } else if (t.last10Digits && t.last10Digits.length >= 10 && contentStr.includes(t.last10Digits)) {
          matched = true;
          matchTerm = t.last10Digits;
        }
        
        if (matched) {
          const idx = contentStr.indexOf(matchTerm);
          const start = Math.max(0, idx - 200);
          const end = Math.min(content.length, idx + 800);
          const slice = content.slice(start, end);
          
          let cleanStr = "";
          for (let i = 0; i < slice.length; i++) {
            const c = slice[i];
            if (c >= 32 && c <= 126) cleanStr += String.fromCharCode(c);
            else if (c === 10 || c === 13) cleanStr += "\n";
            else cleanStr += ".";
          }
          
          matches.push({
            file: filePath,
            contactId: t.id,
            contactName: t.name,
            matchTerm,
            snippet: cleanStr,
          });
        }
      }
    } catch {}
  }

  console.log("Searching Chrome Extension IndexedDB LevelDB...");
  searchInFile(EXTENSION_DB_DIR);
  
  console.log("Searching Chrome Extension IndexedDB Blobs...");
  searchInFile(EXTENSION_BLOB_DIR);

  console.log(`\n=== Total Matches Found: ${matches.length} ===`);
  
  // Group matches by contact ID to see unique contacts found
  const matchedContacts = new Map<string, any>();
  matches.forEach(m => {
    if (!matchedContacts.has(m.contactId)) {
      matchedContacts.set(m.contactId, {
        name: m.contactName,
        files: new Set(),
        snippets: [],
      });
    }
    const record = matchedContacts.get(m.contactId);
    record.files.add(m.file);
    record.snippets.push(m.snippet);
  });

  console.log(`Unique Contacts Matched: ${matchedContacts.size}`);
  
  matchedContacts.forEach((val, key) => {
    console.log(`\nContact ID: ${key} | Name: ${val.name}`);
    console.log(`Files:`, Array.from(val.files));
    console.log(`Snippets (showing first):`);
    console.log(val.snippets[0]);
    console.log("-----------------------------------------------------------------");
  });
}

main().catch(console.error);
