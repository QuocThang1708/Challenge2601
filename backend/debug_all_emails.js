require("dotenv").config();
const emailService = require("./services/emailService");

async function testAll() {
  console.log("=== DEBUGGING ALL EMAIL SERVICES ===");
  console.log("USER:", process.env.EMAIL_USER ? "LOADED" : "MISSING");
  console.log("PASS:", process.env.EMAIL_PASSWORD ? "LOADED" : "MISSING");

  const TEST_EMAIL = "hovanquocthang1708+6@gmail.com";

  // 1. Verification Email
  console.log("\n--- ACION 1: Test Verification Email ---");
  try {
    const res = await emailService.sendVerificationEmail(
      TEST_EMAIL,
      "123456",
      "TestUser"
    );
    console.log("Result:", res);
  } catch (e) {
    console.error("ERROR 1:", e);
  }

  // 2. Password Reset
  console.log("\n--- ACTION 2: Test Password Reset Email ---");
  try {
    const res = await emailService.sendPasswordResetEmail(
      TEST_EMAIL,
      "token-xyz",
      "TestUser"
    );
    console.log("Result:", res);
  } catch (e) {
    console.error("ERROR 2:", e);
  }

  // 3. Report Email
  console.log("\n--- ACTION 3: Test Report Email ---");
  try {
    const res = await emailService.sendReportEmail(
      TEST_EMAIL,
      "Test Report Debug",
      "Today"
    );
    console.log("Result:", res);
  } catch (e) {
    console.error("ERROR 3:", e);
  }
}

testAll();
