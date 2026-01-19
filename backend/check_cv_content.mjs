import fs from "fs";
import pdf from "pdf-parse";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(
  __dirname,
  "uploads/cv/cv-1768278167025-924699980.pdf"
);

async function run() {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    console.log("--- START CONTENT ---");
    console.log(data.text.slice(0, 500)); // Print first 500 chars
    console.log("--- END CONTENT ---");
  } catch (e) {
    console.error(e);
  }
}

run();
