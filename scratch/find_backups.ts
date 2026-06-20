import * as fs from "fs";
import * as path from "path";

const PROJECT_DIR = "/Users/tirthpatel/Downloads/team-app-main";

function traverse(dir: string) {
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
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
      traverse(fullPath);
    } else if (stats.isFile()) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".csv" || ext === ".xlsx" || ext === ".json" || ext === ".txt" || file.includes("backup")) {
        console.log(`Found file: ${fullPath} (${stats.size} bytes)`);
      }
    }
  }
}

console.log("Searching for potential backup/data files in project...");
traverse(PROJECT_DIR);
console.log("Search complete.");
