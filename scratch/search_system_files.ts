import * as fs from "fs";
import * as path from "path";

const DIRECTORIES_TO_SEARCH = [
  "/Users/tirthpatel/Desktop",
  "/Users/tirthpatel/Documents",
  "/Users/tirthpatel/Downloads",
];

function searchFile(filePath: string) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 20 * 1024 * 1024) return; // Skip files > 20MB
    const content = fs.readFileSync(filePath, "utf8");
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes("mishwa") || lowerContent.includes("hansaliya") || lowerContent.includes("hansiya")) {
      console.log(`Potential backup found: ${filePath} (${stats.size} bytes)`);
      
      // Print first 5 lines or matching context
      const lines = content.split("\n");
      console.log("File sample:");
      lines.slice(0, 10).forEach((l, idx) => console.log(`  [${idx + 1}] ${l}`));
      console.log("-----------------------------------------------------------------");
    }
  } catch {}
}

function traverse(dir: string) {
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const file of files) {
    if (file === "node_modules" || file === ".next" || file === ".git" || file === "Library" || file.startsWith(".")) continue;
    const fullPath = path.join(dir, file);
    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      traverse(fullPath);
    } else if (stats.isFile()) {
      // Search text files, csv, xlsx metadata (strings), etc.
      const ext = path.extname(file).toLowerCase();
      if ([".csv", ".txt", ".json", ".tsv", ".html", ".md"].includes(ext)) {
        searchFile(fullPath);
      }
    }
  }
}

console.log("Scanning system directories for files referencing Mishwa...");
DIRECTORIES_TO_SEARCH.forEach(dir => {
  console.log(`Traversing ${dir}...`);
  traverse(dir);
});
console.log("Scan complete.");
