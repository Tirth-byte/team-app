import * as fs from "fs";

const APP_SUPPORT = "/Users/tirthpatel/Library/Application Support";

function main() {
  try {
    const items = fs.readdirSync(APP_SUPPORT);
    console.log("App Support directories:");
    items.forEach(item => {
      if (item.toLowerCase().includes("browser") || item.toLowerCase().includes("chrome") || item.toLowerCase().includes("safari") || item.toLowerCase().includes("firefox") || item.toLowerCase().includes("arc") || item.toLowerCase().includes("brave") || item.toLowerCase().includes("edge")) {
        console.log(`- MATCH: ${item}`);
      } else {
        console.log(`- ${item}`);
      }
    });
  } catch (err) {
    console.error("Error reading App Support:", err);
  }
}

main();
