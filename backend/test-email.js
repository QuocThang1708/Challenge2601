require("dotenv").config();
const nodemailer = require("nodemailer");

async function tryConfig(port, secure) {
  console.log(`\n🔎 Testing Port ${port} (Secure: ${secure})...`);

  const rawPass = process.env.EMAIL_PASSWORD || "";
  const cleanPass = rawPass.replace(/\s+/g, "");

  // Check if password seems valid
  if (cleanPass.length !== 16) {
    console.log(
      `⚠️ Warning: Password length is ${cleanPass.length}, expected 16 for App Password.`,
    );
  }

  const config = {
    host: "smtp.gmail.com",
    port: port,
    secure: secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: cleanPass,
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    logger: false, // Turn off verbose logs
    debug: false,
  };

  const transporter = nodemailer.createTransport(config);
  try {
    await transporter.verify();
    console.log(
      `✅ SUCCESS on Port ${port}! Credentials and Network are GOOD.`,
    );
    return true;
  } catch (error) {
    console.error(
      `❌ FAILED on Port ${port}: ${error.code} - ${error.message}`,
    );
    return false;
  }
}

async function testEmail() {
  console.log("User:", process.env.EMAIL_USER);

  let success = await tryConfig(587, false);

  if (!success) {
    success = await tryConfig(465, true);
  }

  if (success) {
    console.log("\n🎉 FOUND WORKING CONFIGURATION!");
  } else {
    console.log("\n💀 ALL ATTEMPTS FAILED.");
  }
}

testEmail();
