const parser = require("../backend/utils/cvParser");

const sample = `
KINH NGHIỆM CÔNG TÁC

Công ty: Tenomad- Vị trí: QC- Từ năm 2024 đến năm 2026

KINH NGHIỆM LÀM VIỆC

QC / QA Engineer (8 năm kinh nghiệm)- Phân tích tài liệu yêu cầu (BRD, SRS)
`;

console.log("Parsing Sample...");
const res = parser.parse(sample);

console.log("--- Experience Entries ---");
console.log(JSON.stringify(res.experience, null, 2));

if (res.experience.length >= 2) {
  console.log("✅ PASSED: Found 2 entries.");
} else {
  console.log(
    "❌ FAILED: Found " + res.experience.length + " entries (Expected 2)."
  );
  process.exit(1);
}
