const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const { MailtrapClient } = require("mailtrap");

// Configuration
const isDevelopment = process.env.NODE_ENV === "development";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAILTRAP_TOKEN = process.env.MAILTRAP_TOKEN;
// MailTrap account settings (should be in env, but defaults for prompt if missing)
const MAILTRAP_ENDPOINT =
  process.env.MAILTRAP_ENDPOINT || "https://send.api.mailtrap.io/";

// 1. MailTrap Client (Primary for Render Testing without Domain)
const mailtrapClient = MAILTRAP_TOKEN
  ? new MailtrapClient({ token: MAILTRAP_TOKEN, endpoint: MAILTRAP_ENDPOINT })
  : null;

// 2. Resend Client (Backup)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// 3. Gmail OAuth2 Transporter (Alternative Production)
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

const oauthTransporter = isDevelopment ? null : createOAuthTransporter();

// Legacy SMTP Transporter for Local Dev
const createSmtpTransporter = () => {
  const emailPassword = (process.env.EMAIL_PASSWORD || "").replace(/\s+/g, "");
  if (!process.env.EMAIL_USER || !emailPassword) return null;

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: { user: process.env.EMAIL_USER, pass: emailPassword },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
  });
};

/**
 * Universal Send Function
 * - Development: SMTP only (fast, no OAuth delays)
 * - Production: MailTrap (Testing) → OAuth2 → Resend → SMTP
 */
async function sendEmail({ to, subject, html, text, attachments }) {
  console.log(`🚀 Sending email to: ${to}`);

  // DEVELOPMENT MODE: Use SMTP directly
  if (isDevelopment) {
    console.log("🛠️ Development Mode: Using SMTP");
    const transporter = createSmtpTransporter();
    if (!transporter) throw new Error("Missing SMTP credentials for Local Dev");

    const info = await transporter.sendMail({
      from: `"HRM System" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(",") : to,
      subject,
      html,
      text,
      attachments,
    });
    console.log("✅ Local SMTP Success:", info.messageId);
    return { success: true, messageId: info.messageId, provider: "smtp_local" };
  }

  // PRODUCTION MODE (Render)

  // STRATEGY 1: MailTrap (Best for Testing on Render without Domain)
  // Note: MailTrap Sending API requires verified domain unless using Sandbox via SMTP (which is blocked).
  // BUT MailTrap "Testing" (Sandbox) is SMTP only. "Sending" is API.
  // Wait, user wants to use "Testing" (Sandbox) to view emails. Sandbox is SMTP port 2525.
  // Render Free blocks SMTP.
  // Solution: We try MailTrap Transporter (Nodemailer) on Port 2525. If blocked, we fail.
  // BUT user said "Can I run... on Render".
  // Actually, MailTrap HAS an API for Sandbox (Testing). Let's use `mailtrap` client to send to inbox?
  // The official `mailtrap` client sends to the *Sending* domain.
  // To send to *Sandbox* (Testing), you MUST use SMTP.
  // HOWEVER, Render allows port 2525? Some sources say yes, some say no.
  // Let's TRY MailTrap SMTP Strategy first for Render if MAILTRAP_USER is present.

  if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
    console.log("👉 Strategy: MailTrap Sandbox (SMTP)");
    try {
      const mtTransporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS,
        },
      });

      const info = await mtTransporter.sendMail({
        from: `"HRM System" <mailtrap@example.com>`, // Sender doesn't matter in sandbox
        to: Array.isArray(to) ? to.join(",") : to,
        subject,
        html,
        text,
        attachments,
      });
      console.log("✅ MailTrap Sandbox Success:", info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        provider: "mailtrap_sandbox",
      };
    } catch (err) {
      console.error(
        "❌ MailTrap Sandbox Failed (Likely Port Blocked):",
        err.message,
      );
    }
  }

  // STRATEGY 2: Gmail OAuth2 (If configured)
  if (oauthTransporter) {
    try {
      console.log("👉 Strategy: Gmail OAuth2");
      const info = await oauthTransporter.sendMail({
        from: `"HRM System" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(",") : to,
        subject,
        html,
        text,
        attachments,
      });
      console.log("✅ OAuth2 Success:", info.messageId);
      return { success: true, messageId: info.messageId, provider: "oauth2" };
    } catch (err) {
      console.error("❌ OAuth2 Failed:", err.message);
    }
  }

  // STRATEGY 3: Resend API (Backup)
  if (resend) {
    try {
      console.log("👉 Resend Strategy");
      const data = await resend.emails.send({
        from: "onboarding@resend.dev",
        to, // Restricted to signed-up email only on Free tier!
        subject,
        html,
        text,
        attachments: attachments
          ? attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
            }))
          : undefined,
      });
      if (data.error) throw new Error(data.error.message);
      console.log("✅ Resend Success:", data.data.id);
      return { success: true, messageId: data.data.id, provider: "resend" };
    } catch (err) {
      console.error("❌ Resend Failed:", err.message);
    }
  }

  throw new Error("All email strategies failed on Render.");
}

async function sendVerificationEmail(toEmail, verificationCode, userName) {
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
            <div class="header">
                <h1>HRM SYSTEM</h1>
            </div>
            <div class="content">
                <h2>Xin chào ${userName}!</h2>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại HRM System.</p>
                <p>Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã xác thực bên dưới:</p>
                
                <div class="code-box">
                    <div class="code">${verificationCode}</div>
                </div>
                
                <p><strong>Lưu ý:</strong></p>
                <ul>
                    <li>Mã xác thực có hiệu lực trong <strong>15 phút</strong></li>
                    <li>Không chia sẻ mã này với bất kỳ ai</li>
                    <li>Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này</li>
                </ul>
            </div>
            <div class="footer">
                <p>© 2026 HRM System. All rights reserved.</p>
                <p>Email này được gửi tự động, vui lòng không reply.</p>
            </div>
        </div>
    </body>
    </html>
  `;
  return sendEmail({
    to: toEmail,
    subject: "Xác thực tài khoản - HRM System",
    html,
  });
}

async function sendPasswordResetEmail(toEmail, resetToken, userName) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; }
            .content { background: #f5f5f5; padding: 30px; }
            .button { display: inline-block; background: #e53935; color: #fff; padding: 12px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>HRM SYSTEM</h1>
            </div>
            <div class="content">
                <h2>Xin chào ${userName || "Bạn"}!</h2>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <p>Token đặt lại mật khẩu: <strong>${resetToken}</strong></p>
                <p>Token có hiệu lực trong 1 giờ.</p>
            </div>
        </div>
    </body>
    </html>
  `;
  return sendEmail({
    to: toEmail,
    subject: "Đặt lại mật khẩu - HRM System",
    html,
  });
}

async function sendReportEmail(
  toEmail,
  reportName,
  dateRange,
  attachments = [],
) {
  const html = `
    <div style="font-family: Arial; padding: 20px;">
        <h2>Báo cáo: ${reportName}</h2>
        <p>Thời gian: ${dateRange}</p>
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
