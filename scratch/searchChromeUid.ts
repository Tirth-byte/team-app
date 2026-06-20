import * as fs from "fs";
import * as path from "path";

const SEARCH_DIR = "/Users/tirthpatel/Library/Application Support/Google/Chrome";
const UID = "A1gwf0ASuBOsbP1kgVDPVlQfbRw1";

function searchFile(filePath: string, query: string) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 50 * 1024 * 1024) return; // Skip files > 50MB
    const content = fs.readFileSync(filePath);
    if (content.includes(query)) {
      console.log(`Match found in: ${filePath}`);
      const index = content.indexOf(query);
      const start = Math.max(0, index - 300);
      const end = Math.min(content.length, index + 1000);
      const slice = content.slice(start, end);
      
      // Print as ascii readable characters
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
    const fullPath = path.join(dir, file);
    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch { continue; }
    
    if (stats.isDirectory()) {
      traverse(fullPath, query);
    } else if (stats.isFile()) {
      // Search all files since leveldb files might not have extension or might be named differently
      searchFile(fullPath, query);
    }
  }
}

console.log(`Searching Chrome for UID: ${UID}`);
traverse(SEARCH_DIR, UID);
console.log("Search completed.");
