require("dotenv").config();
const nodemailer = require("nodemailer");

async function testOAuth() {
  console.log("🔍 Testing Gmail OAuth2...");

  // Check vars
  const user = process.env.EMAIL_USER;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!user || !clientId || !clientSecret || !refreshToken) {
    console.error("❌ Missing OAuth Credentials in .env");
    return;
  }

  console.log(`User: ${user}`);
  console.log(`ClientID: ${clientId.substring(0, 10)}...`);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: user,
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: refreshToken,
    },
  });

  try {
    console.log(
      "⏳ Verifying configuration (fetching Access Token internally)...",
    );
    await transporter.verify();
    console.log("✅ OAuth Configuration is VALID! (Access Token retrieved)");

    console.log("🚀 Sending Test Email...");
    const info = await transporter.sendMail({
      from: `"Test OAuth" <${user}>`,
      to: user, // Send to self
      subject: "Gmail OAuth2 Test - Success!",
      text: "If you see this, Render Free Tier will work 100%!",
    });

    console.log("✅ Email Sent! ID:", info.messageId);
  } catch (error) {
    console.error("❌ OAuth Test Failed:", error.message);
    if (error.response) console.error("Full Error:", error.response);
  }
}

testOAuth();
