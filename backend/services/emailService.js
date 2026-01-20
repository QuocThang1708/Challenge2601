const nodemailer = require("nodemailer");
const { Resend } = require("resend");

// Configuration
const isProduction = process.env.NODE_ENV === "production";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// 1. Resend Client (Backup / Domain-verified usage)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// 2. Gmail OAuth2 Transporter (Primary for Free Tier w/o Domain)
// This works via HTTP API (internally) so it bypasses SMTP port blocks.
const createOAuthTransporter = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
  });
};

const oauthTransporter = createOAuthTransporter();

/**
 * Universal Send Function
 * Priority:
 * 1. OAuth2 (Best for Render Free w/o Domain)
 * 2. Resend (Good if you have Domain, else limited)
 * 3. SMTP (Legacy/Local only)
 */
async function sendEmail({ to, subject, html, text, attachments }) {
  console.log(`🚀 Sending email to: ${to} | Subject: ${subject}`);

  // STRATEGY 1: OAuth2 (Gmail API) - RECOMMENDED
  if (oauthTransporter) {
    try {
      console.log("👉 Strategy: Gmail OAuth2");
      const mailOptions = {
        from: `"HRM System" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(",") : to,
        subject: subject,
        html: html,
        text: text,
        attachments: attachments,
      };

      const info = await oauthTransporter.sendMail(mailOptions);
      console.log("✅ OAuth2 Success! Message ID:", info.messageId);
      return { success: true, messageId: info.messageId, provider: "oauth2" };
    } catch (err) {
      console.error("❌ OAuth2 Failed:", err.message);
      console.warn("⚠️ Falling back to next strategy...");
    }
  }

  // STRATEGY 2: Resend API
  if (resend) {
    try {
      console.log("👉 Strategy: Resend API");
      const data = await resend.emails.send({
        from: "onboarding@resend.dev", // Verified domain or onboarding
        to: to,
        subject: subject,
        html: html,
        text: text,
        attachments: attachments
          ? attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
            }))
          : undefined,
      });

      if (data.error) throw new Error(data.error.message);
      console.log("✅ Resend Success! ID:", data.data.id);
      return { success: true, messageId: data.data.id, provider: "resend" };
    } catch (err) {
      console.error("❌ Resend Failed:", err.message);
    }
  }

  // STRATEGY 3: SMTP (Legacy/Local)
  // Likely blocked on Render, but good for local dev
  try {
    console.log("👉 Strategy: Legacy SMTP");
    // Re-create transporter on fly to ensure loose coupling
    const emailPassword = (process.env.EMAIL_PASSWORD || "").replace(
      /\s+/g,
      "",
    );
    if (!process.env.EMAIL_USER || !emailPassword)
      throw new Error("No SMTP Creds");

    const smtpTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: emailPassword },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
    });

    const info = await smtpTransporter.sendMail({
      from: `"HRM System" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(",") : to,
      subject: subject,
      html: html,
      text: text,
      attachments: attachments,
    });
    console.log("✅ SMTP Success! Message ID:", info.messageId);
    return { success: true, messageId: info.messageId, provider: "smtp" };
  } catch (err) {
    console.error("❌ All Strategies Failed!");
    throw err;
  }
}

// ============================================================
// Helper Functions (Templates)
// ============================================================

async function sendVerificationEmail(toEmail, verificationCode, userName) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Xin chào ${userName}!</h2>
        <p>Mã xác thực của bạn là:</p>
        <h1 style="color: #e53935; letter-spacing: 5px;">${verificationCode}</h1>
        <p>Mã có hiệu lực 15 phút.</p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject: "Mã Xác Thực - HRM", html });
}

async function sendPasswordResetEmail(toEmail, resetToken, userName) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Xin chào ${userName}!</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
        <p>Token của bạn: <strong>${resetToken}</strong></p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject: "Đặt Lại Mật Khẩu - HRM", html });
}

async function sendReportEmail(
  toEmail,
  reportName,
  dateRange,
  attachments = [],
) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Báo cáo: ${reportName}</h2>
        <p>Thời gian: ${dateRange}</p>
        <p>File đính kèm bên dưới.</p>
    </div>
  `;
  return sendEmail({
    to: toEmail,
    subject: `Báo cáo: ${reportName}`,
    html,
    attachments,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendReportEmail,
};
