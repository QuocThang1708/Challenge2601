require("dotenv").config();
const { sendVerificationEmail } = require("./services/emailService");

async function testLocalEmail() {
  console.log("🔍 Testing Local Email (SMTP Fallback)...");
  console.log(`Current NODE_ENV: ${process.env.NODE_ENV}`);

  const testEmail = process.env.EMAIL_USER;
  if (!testEmail) {
    console.error("❌ Missing EMAIL_USER in .env");
    return;
  }

  try {
    console.log(`🚀 Attempting to send verification email to ${testEmail}...`);
    const result = await sendVerificationEmail(
      testEmail,
      "123456",
      "Test User",
    );

    if (result.success) {
      console.log("✅ Checkpoint Passed: Email function returned success.");
      console.log("👉 Message ID:", result.messageId);
      if (result.provider === "smtp") {
        console.log("✅ Verified: Provider is SMTP (Correct for Local/Dev)");
      } else {
        console.warn(
          `⚠️ Warning: Provider is ${result.provider}, expected SMTP`,
        );
      }
    } else {
      console.error("❌ Email function returned failure:", result);
    }
  } catch (error) {
    console.error("❌ Exception during test:", error);
  }
}

testLocalEmail();
