require("dotenv").config();
const { Resend } = require("resend");

async function testResend() {
  console.log("🔍 Testing Resend API...");
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.error("❌ No RESEND_API_KEY found in .env");
    return;
  }

  console.log(`🔑 Key found: ${key.substring(0, 5)}...`);

  const resend = new Resend(key);

  try {
    console.log("🚀 Sending test email...");
    // IMPORTANT: On Free Tier, you can ONLY send to the email address you registered with Resend.
    // Assuming EMAIL_USER corresponds to that, or we'll try to guess.
    const toEmail = process.env.EMAIL_USER;

    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: toEmail,
      subject: "Resend API Test - HRM System",
      html: "<h1>It Works!</h1><p>Resend API is successfully integrated via HTTP.</p>",
    });

    if (data.error) {
      console.error("❌ Resend Error:", data.error);
    } else {
      console.log("✅ Success! ID:", data.data.id);
      console.log("👉 Check your inbox at:", toEmail);
    }
  } catch (err) {
    console.error("❌ Exception:", err);
  }
}

testResend();
