const nodemailer = require("nodemailer");

// Email transporter configuration
// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    // Determine if we need to accept self-signed certificates (usually not for Gmail, but good for debugging)
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000, // 10 seconds timeout
});

// Send verification email
async function sendVerificationEmail(toEmail, verificationCode, userName) {
  // DEBUG LOGGING
  console.log("==========================================");
  console.log("📧 ATTEMPTING EMAIL SEND (Verification)");
  console.log(`To: ${toEmail}`);
  console.log(`User: ${userName}`);
  console.log(`Code: ${verificationCode}`);
  console.log("==========================================");

  const mailOptions = {
    from: `"HRM System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Xác thực tài khoản - HRM System",
    html: `
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
        `,
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("⚠️ SMTP credentials missing. Skipping actual email send.");
      return { success: true, messageId: "mock-send" };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email send error:", error);
    throw error;
  }
}

// Send password reset email (for future use)
async function sendPasswordResetEmail(toEmail, resetToken, userName) {
  // DEBUG LOGGING
  console.log("==========================================");
  console.log("📧 ATTEMPTING EMAIL SEND (Password Reset)");
  console.log(`To: ${toEmail}`);
  console.log(`User: ${userName}`);
  console.log(`Reset Token: ${resetToken}`);
  console.log("==========================================");

  const mailOptions = {
    from: `"HRM System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Đặt lại mật khẩu - HRM System",
    html: `
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
        `,
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("⚠️ SMTP credentials missing. Skipping actual email send.");
      return { success: true, messageId: "mock-send" };
    }
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Password reset email error:", error);
    // In dev, don't crash if email fails
    return { success: false, error: error.message };
  }
}

// Send report email with professional template
async function sendReportEmail(
  toEmail,
  reportName,
  dateRange,
  attachments = [],
) {
  // DEBUG LOGGING
  console.log("==========================================");
  console.log("📧 SENDING REPORT EMAIL");
  console.log(`To: ${toEmail}`);
  console.log(`Report: ${reportName}`);
  console.log("==========================================");

  const subject = `[HRM System] Báo cáo tự động: ${reportName}`;

  // Professional HTML Template
  const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                .header { background: #000; color: #fff; padding: 15px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { padding: 20px; background: #f9f9f9; }
                .info-box { background: #fff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }
                .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
                .btn { display: inline-block; background: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 3px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>HRM REPORT SYSTEM</h2>
                </div>
                <div class="content">
                    <p>Xin chào Ban Lãnh đạo,</p>
                    <p>Hệ thống HRM xin gửi báo cáo định kỳ theo lịch trình.</p>
                    
                    <div class="info-box">
                        <p><strong>Tên báo cáo:</strong> ${reportName}</p>
                        <p><strong>Phạm vi dữ liệu:</strong> ${dateRange}</p>
                        <p><strong>Ngày tạo:</strong> ${new Date().toLocaleString(
                          "vi-VN",
                        )}</p>
                    </div>

                    <p>File báo cáo chi tiết được đính kèm trong email này. Vui lòng kiểm tra.</p>
                    
                    <p>Trân trọng,<br>Admin</p>
                </div>
                <div class="footer">
                    <p>© 2026 HRM System. Email này được gửi tự động.</p>
                </div>
            </div>
        </body>
        </html>
    `;

  const mailOptions = {
    from: `"HRM System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent,
    attachments: attachments,
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn(
        "⚠️ SMTP credentials missing inside .env. Cannot send email.",
      );
      // We throw error here to make it visible in logs
      throw new Error("SMTP Credentials Missing in Environment");
    }

    // Verify connection first? No, just send.
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Report email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Send Report Error:", error);
    // Throwing error allows Scheduler to catch and log it
    throw error;
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendReportEmail,
};
