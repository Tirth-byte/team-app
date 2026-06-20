import * as fs from "fs";
import * as path from "path";

const DOWNLOADS_DIR = "/Users/tirthpatel/Downloads";

async function main() {
  console.log("=== LISTING DOWNLOADS DIRECTORY ===");
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const fileInfos = files.map(file => {
      const fullPath = path.join(DOWNLOADS_DIR, file);
      try {
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          isDir: stats.isDirectory(),
          size: stats.size,
          mtime: stats.mtime,
        };
      } catch {
        return null;
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    // Sort by mtime descending (most recent first)
    fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    console.log(`Total items in Downloads: ${fileInfos.length}`);
    console.log("\nTop 50 most recent items:");
    fileInfos.slice(0, 50).forEach(info => {
      console.log(`- ${info.mtime.toISOString()} | ${info.isDir ? "[DIR]" : "[FILE]"} | ${info.size} bytes | ${info.name}`);
    });
  } catch (err) {
    console.error("Error reading downloads dir:", err);
  }
}

main();
