import * as fs from "fs";

const BLOB_PATH = "/Users/tirthpatel/Library/Application Support/Google/Chrome/Default/IndexedDB/chrome-extension_ppmcbemphmekpnpbddecgkbemenginpf_0.indexeddb.blob/1/00/5";

async function main() {
  try {
    const stats = fs.statSync(BLOB_PATH);
    console.log(`Blob file size: ${stats.size} bytes`);
    const data = fs.readFileSync(BLOB_PATH);
    
    // Print first 500 characters as string
    console.log("First 500 characters of blob as string:");
    console.log(data.toString("utf8").slice(0, 500));
    
    // Check if it's JSON
    try {
      const parsed = JSON.parse(data.toString("utf8"));
      console.log("Successfully parsed as JSON. Keys:", Object.keys(parsed));
    } catch {
      console.log("Could not parse as JSON directly.");
    }
  } catch (err) {
    console.error("Error reading blob:", err);
  }
}

main();
