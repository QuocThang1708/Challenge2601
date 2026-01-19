const mammoth = require("../backend/node_modules/mammoth");
const fs = require("fs");
const path = require("path");

const filePath = "c:\\HRM-AI\\CV_QC_8_nam_kinh_nghiem.docx";

console.log(`Reading: ${filePath}`);
mammoth
  .extractRawText({ path: filePath })
  .then(function (result) {
    const text = result.value;
    fs.writeFileSync("tests/cv_content.txt", text);
    console.log("Written to tests/cv_content.txt");
  })
  .catch(console.error);
