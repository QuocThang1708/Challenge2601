const fs = require("fs");
const path = require("path");

async function test() {
  console.log("--- Testing pdf-parse ---");

  // Test require
  let pdf;
  try {
    pdf = require("pdf-parse");
    console.log("Required 'pdf-parse'. Type:", typeof pdf);
    console.log("Structure:", pdf);
    if (pdf.default) console.log("Has default export:", typeof pdf.default);
  } catch (e) {
    console.error("Require failed:", e.message);
  }

  // Read file
  const filePath = path.join(
    __dirname,
    "uploads/cv/cv-1768464434466-591979442.pdf"
  );
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }
  const dataBuffer = fs.readFileSync(filePath);

  // Attempt 1: Standard usage
  try {
    console.log("\nAttempt 1: pdf(dataBuffer)");
    const data = await pdf(dataBuffer);
    console.log("Success! Data keys:", Object.keys(data));
    console.log("Text length:", data.text.length);
  } catch (e) {
    console.error("Attempt 1 failed:", e.message);
  }

  // Attempt 2: New Class usage
  try {
    console.log("\nAttempt 2: new pdf(dataBuffer)");
    const instance = new pdf(dataBuffer);
    console.log("Instance created. Keys:", Object.keys(instance));
  } catch (e) {
    console.error("Attempt 2 failed:", e.message);
  }
}

test();
