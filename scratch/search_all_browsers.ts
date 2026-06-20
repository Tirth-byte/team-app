import * as fs from "fs";
import * as path from "path";

const SEARCH_DIRS = [
  "/Users/tirthpatel/Library/Application Support/Google/Chrome",
  "/Users/tirthpatel/Library/Application Support/BraveSoftware",
  "/Users/tirthpatel/Library/Application Support/Arc",
  "/Users/tirthpatel/Library/Application Support/Firefox",
  "/Users/tirthpatel/Library/Application Support/Microsoft Edge",
  "/Users/tirthpatel/Library/Application Support/com.operasoftware.Opera",
];

const QUERY = "mishwa";

function searchFile(filePath: string, query: string) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 20 * 1024 * 1024) return; // Skip files > 20MB
    const content = fs.readFileSync(filePath);
    const contentStr = content.toString("utf8").toLowerCase();
    
    if (contentStr.includes(query.toLowerCase())) {
      console.log(`[MATCH] Found in: ${filePath}`);
      const index = contentStr.indexOf(query.toLowerCase());
      const start = Math.max(0, index - 200);
      const end = Math.min(content.length, index + 800);
      const slice = content.slice(start, end);
      
      let out = "";
      for (let i = 0; i < slice.length; i++) {
        const c = slice[i];
        if (c >= 32 && c <= 126) out += String.fromCharCode(c);
        else if (c === 10 || c === 13) out += "\n";
        else out += ".";
      }
      console.log("Snippet:");
      console.log(out);
      console.log("--------------------------------------");
    }
  } catch {}
}

function traverse(dir: string, query: string) {
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch { return; }
  
  for (const file of files) {
    if (file === "Caches" || file === "Cache" || file.startsWith(".")) continue;
    const fullPath = path.join(dir, file);
    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch { continue; }
    
    if (stats.isDirectory()) {
      traverse(fullPath, query);
    } else if (stats.isFile()) {
      // Check leveldb, localstorage, sqlite, log files
      const ext = path.extname(file).toLowerCase();
      if (ext === ".ldb" || ext === ".log" || ext === ".sqlite" || file.includes("localstorage") || file.includes("leveldb") || ext === "") {
        searchFile(fullPath, query);
      }
    }
  }
}

async function main() {
  console.log(`Scanning all browsers for query: '${QUERY}'...`);
  for (const dir of SEARCH_DIRS) {
    if (fs.existsSync(dir)) {
      console.log(`Scanning ${dir}...`);
      traverse(dir, QUERY);
    }
  }
  console.log("Scan completed.");
}

main().catch(console.error);
