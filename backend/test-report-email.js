require("dotenv").config();
const emailService = require("./services/emailService");

async function testReportEmail() {
  console.log("🧪 Testing Report Email with Attachments...\n");

  const testCSV =
    "Name,Department,Salary\nNguyen Van A,IT,15000000\nTran Thi B,HR,12000000";

  try {
    const result = await emailService.sendReportEmail(
      "hovanquocthang1708@gmail.com",
      "Test Report - Manual Trigger",
      "2026-01-15 - 2026-01-20",
      [
        {
          filename: "test-report.csv",
          content: "\uFEFF" + testCSV,
        },
      ],
    );

    console.log("\n✅ SUCCESS!");
    console.log("Result:", result);
  } catch (error) {
    console.error("\n❌ FAILED!");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testReportEmail();
