const fs = require("fs");
const path = require("path");

// Manually resolve if needed, or just require
const pdfLib = require("pdf-parse");

const filePath = path.join(
  __dirname,
  "uploads/cv/cv-1768278573843-781228339.pdf"
);

async function run() {
  let pdf = pdfLib;
  // Handle potential ESM/CJS interop mismatch
  if (typeof pdf !== "function" && pdf.default) {
    pdf = pdf.default;
  }

  if (typeof pdf !== "function") {
    console.error("Critical: pdf-parse is not a function:", typeof pdf);
    return;
  }

  try {
    console.log(`Reading file: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.error("File does not exist!");
      return;
    }
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    console.log("--- START CONTENT SNIPPET ---");
    console.log(data.text.slice(0, 500));
    console.log("--- END CONTENT SNIPPET ---");
  } catch (e) {
    console.error("Error reading PDF:", e);
  }
}

run();
