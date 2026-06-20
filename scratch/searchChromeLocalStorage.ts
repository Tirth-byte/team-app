import * as fs from "fs";
import * as path from "path";

const SEARCH_DIR = "/Users/tirthpatel/Library/Application Support/Google/Chrome";

function searchFile(filePath: string, query: string) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 50 * 1024 * 1024) return; // Skip files larger than 50MB
    const content = fs.readFileSync(filePath);
    if (content.includes(query)) {
      console.log(`Match found in: ${filePath}`);
      // Let's search around the match
      const index = content.indexOf(query);
      const start = Math.max(0, index - 500);
      const end = Math.min(content.length, index + 2000);
      const bufferSlice = content.slice(start, end);
      console.log("Snippet around match:");
      // Replace non-printable characters with dots
      let printable = "";
      for (let i = 0; i < bufferSlice.length; i++) {
        const charCode = bufferSlice[i];
        if (charCode >= 32 && charCode <= 126) {
          printable += String.fromCharCode(charCode);
        } else if (charCode === 10 || charCode === 13) {
          printable += "\n";
        } else {
          printable += ".";
        }
      }
      console.log(printable);
      console.log("------------------------------------------");
    }
  } catch (err) {
    // Ignore read errors
  }
}

function traverse(dir: string, query: string) {
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
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
    } else if (stats.isFile() && (file.endsWith(".ldb") || file.endsWith(".log") || file.includes("localstorage"))) {
      searchFile(fullPath, query);
    }
  }
}

async function main() {
  const query = "mishwa.hans";
  console.log(`Searching for '${query}' in Chrome directories...`);
  traverse(SEARCH_DIR, query);
}

main().catch(console.error);
