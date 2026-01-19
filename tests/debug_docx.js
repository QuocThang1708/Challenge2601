const mammoth = require("../backend/node_modules/mammoth");
const fs = require("fs");
const path = require("path");
const parser = require("../backend/utils/cvParser");

const filePath = "c:\\HRM-AI\\CV_QC_8_nam_kinh_nghiem.docx";

console.log(`Checking file exists at: ${filePath}`);
if (!fs.existsSync(filePath)) {
  console.error("File not found!");
  process.exit(1);
}

console.log("Attempting to parse with Mammoth...");

mammoth
  .extractRawText({ path: filePath })
  .then(function (result) {
    const text = result.value;
    const messages = result.messages;
    console.log(`Extraction Success! Text length: ${text.length}`);

    console.log("--- START TEXT ---");
    console.log(text.substring(0, 500) + "...");
    console.log("--- END TEXT ---");

    console.log("Attempting to run CV Parser Agnet...");
    const extracted = parser.parse(text);
    console.log("Parser Results:", JSON.stringify(extracted, null, 2));
  })
  .catch(function (error) {
    console.error("Mammoth Error:", error);
  });
