import * as fs from "fs";
import * as path from "path";

const SEARCH_DIR = "/Users/tirthpatel/Downloads";

function searchFile(filePath: string, query: string) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 20 * 1024 * 1024) return; // Skip files larger than 20MB
    const content = fs.readFileSync(filePath, "utf8");
    if (content.toLowerCase().includes(query.toLowerCase())) {
      console.log(`Match found in file: ${filePath}`);
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
    if (file === "node_modules" || file === ".next" || file === ".git" || file === "scratch") continue;
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

async function main() {
  const query = "mishwa.hans";
  console.log(`Searching for '${query}' in Downloads...`);
  traverse(SEARCH_DIR, query);
}

main().catch(console.error);
