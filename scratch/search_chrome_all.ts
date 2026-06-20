import * as fs from "fs";
import * as path from "path";

const SEARCH_DIR = "/Users/tirthpatel/Library/Application Support/Google/Chrome";

function searchFile(filePath: string, query: string) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 100 * 1024 * 1024) return; // Skip files larger than 100MB
    const content = fs.readFileSync(filePath);
    const contentStr = content.toString("utf8").toLowerCase();
    
    if (contentStr.includes(query.toLowerCase())) {
      console.log(`Match found in file: ${filePath}`);
      const idx = contentStr.indexOf(query.toLowerCase());
      const start = Math.max(0, idx - 500);
      const end = Math.min(content.length, idx + 2000);
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
      console.log("------------------------------------------");
    }
  } catch (err) {
    // Ignore errors
  }
}

function traverse(dir: string, query: string) {
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const file of files) {
    const fullPath = path.join(dir, file);
    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      traverse(fullPath, query);
    } else if (stats.isFile()) {
      searchFile(fullPath, query);
    }
  }
}

console.log("Searching Chrome for 'mishwa'...");
traverse(SEARCH_DIR, "mishwa");
console.log("Search complete.");
