const nodemailer = require("nodemailer");
const { Resend } = require("resend");

// Email transporter configuration
const isProduction = process.env.NODE_ENV === "production";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Initialize Resend if key exists
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// SMTP Fallback (Nodemailer)
const emailPassword = (process.env.EMAIL_PASSWORD || "").replace(/\s+/g, "");
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: emailPassword,
  },
  tls: { rejectUnauthorized: false },
  family: isProduction ? 4 : undefined,
  connectionTimeout: 10000,
});

/**
 * Universal Send Function
 * Tries Resend first, falls back to SMTP if Resend key is missing.
 */
async function sendEmail({ to, subject, html, text, attachments }) {
  // Option A: Use Resend (Preferred)
  if (resend) {
    try {
      console.log("🚀 Sending via Resend API...");
      // Note: On Free Tier SDK, 'from' must be 'onboarding@resend.dev' unless domain verified.
      // We'll use onboarding for safety until user verifies domain.
      const fromEmail = "onboarding@resend.dev";

      const data = await resend.emails.send({
        from: fromEmail,
        to: to, // Must be the registered email on Free Tier
        subject: subject,
        html: html,
        text: text, // Optional plain text
        attachments: attachments
          ? attachments.map((a) => ({
              filename: a.filename,
              content: a.content, // Resend supports Buffer or string content
            }))
          : undefined,
      });

      if (data.error) {
        console.error("❌ Resend API Error:", data.error);
        throw new Error(data.error.message);
      }

      console.log("✅ Email sent via Resend:", data.data.id);
      return { success: true, messageId: data.data.id, provider: "resend" };
    } catch (err) {
      console.warn("⚠️ Resend failed, trying SMTP fallback...", err.message);
      // Proceed to fallback
    }
  }

  // Option B: SMTP Fallback
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("⚠️ SMTP credentials missing. Skipping email.");
      return { success: false, error: "No credentials" };
    }

    const mailOptions = {
      from: `"HRM System" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(",") : to,
      subject: subject,
      html: html,
      text: text,
      attachments: attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent via SMTP:", info.messageId);
    return { success: true, messageId: info.messageId, provider: "smtp" };
  } catch (error) {
    console.error("❌ SMTP Error:", error);
    throw error;
  }
}

// 1. Verification Email
async function sendVerificationEmail(toEmail, verificationCode, userName) {
  console.log(`📧 Preparing Verification Email for ${toEmail}`);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; }
            .content { background: #f5f5f5; padding: 30px; }
            .code-box { background: #fff; border: 3px solid #000; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #e53935; }
            .footer { text-align: center; padding: 20px; color: #757575; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h1>HRM SYSTEM</h1></div>
            <div class="content">
                <h2>Xin chào ${userName}!</h2>
                <p>Mã xác thực đăng ký tài khoản của bạn:</p>
                <div class="code-box"><div class="code">${verificationCode}</div></div>
                <p>Mã có hiệu lực trong 15 phút.</p>
            </div>
            <div class="footer"><p>© 2026 HRM System</p></div>
        </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: "Xác thực tài khoản - HRM System",
    html: html,
  });
}

// 2. Password Reset
async function sendPasswordResetEmail(toEmail, resetToken, userName) {
  console.log(`📧 Preparing Password Reset Email for ${toEmail}`);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; }
            .content { background: #f5f5f5; padding: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h1>HRM SYSTEM</h1></div>
            <div class="content">
                <h2>Xin chào ${userName || "Bạn"}!</h2>
                <p>Yêu cầu đặt lại mật khẩu của bạn.</p>
                <p>Token: <strong>${resetToken}</strong></p>
                <p>Token sẽ hết hạn sau 1 giờ.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: "Đặt lại mật khẩu - HRM System",
    html: html,
  });
}

// 3. Report Email
async function sendReportEmail(
  toEmail,
  reportName,
  dateRange,
  attachments = [],
) {
  console.log(`📧 Preparing Report Email: ${reportName}`);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
            .header { background: #000; color: #fff; padding: 15px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .info-box { background: #fff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h2>HRM REPORT SYSTEM</h2></div>
            <div class="content">
                <p>Báo cáo định kỳ từ hệ thống.</p>
                <div class="info-box">
                    <p><strong>Báo cáo:</strong> ${reportName}</p>
                    <p><strong>Thời gian:</strong> ${dateRange}</p>
                </div>
                <p>File đính kèm trong email.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[HRM System] Báo cáo: ${reportName}`,
    html: html,
    attachments: attachments,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendReportEmail,
};
