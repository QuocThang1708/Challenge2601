const fs = require("fs");
const path = require("path");

console.log("Resolving pdf-parse:", require.resolve("pdf-parse"));
const pdf = require("pdf-parse");
console.log("Type of pdf:", typeof pdf);
console.log("PDF keys:", Object.keys(pdf));
console.log("PDF export:", pdf);

const filePath = path.join(
  __dirname,
  "uploads/cv/cv-1768278167025-924699980.pdf"
);

async function run() {
  try {
    let pdfFunc = pdf;
    // Try common patterns if it's not a function
    if (typeof pdf !== "function") {
      if (pdf.default) pdfFunc = pdf.default;
      else if (pdf.PDFParse) pdfFunc = pdf.PDFParse;
    }

    if (typeof pdfFunc !== "function") {
      console.error("STILL NOT A FUNCTION. Aborting.");
      return;
    }

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfFunc(dataBuffer);

    console.log("--- START EXTRACTED TEXT ---");
    console.log(data.text);
    console.log("--- END EXTRACTED TEXT ---");
  } catch (e) {
    console.error(e);
  }
}

run();
