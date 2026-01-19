const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs").promises;
const path = require("path");
const { sendVerificationEmail } = require("../services/emailService");
const { auth } = require("../middlewares/auth");

// Simple JSON file database
const DB_PATH = path.join(__dirname, "../data/users.json");

// Helper to read database
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // Initialize with default admin user
    const defaultData = {
      users: [
        {
          id: "1",
          employeeId: "CB0001",
          name: "Admin",
          email: "admin@congdoan.vn",
          password: await bcrypt.hash("admin123", 10),
          phone: "0900000000",
          role: "admin",
          status: "Đang công tác",
          department: "Hành chính",
          position: "Admin",
          gender: "Nam",
          birthDate: "1990-01-01",
          idCard: "001090000000",
          address: "Hà Nội",
          unionDate: "2010-01-01",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
}

// Helper to write database
async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      employeeId,
      password,
      department,
      position,
      gender,
      birthDate,
    } = req.body;

    // Validation - Required fields
    if (!name || !email || !password || !employeeId || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng điền đầy đủ: Họ tên, Email, Mã cán bộ, Số điện thoại, Mật khẩu",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    // Phone validation (Vietnam format)
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ (phải là số Việt Nam 10 chữ số)",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    const db = await readDB();

    // Check for duplicates with specific error messages
    const existingEmail = db.users.find((u) => u.email === email);
    const existingPhone = db.users.find((u) => u.phone === phone);
    const existingEmployeeId = db.users.find(
      (u) => u.employeeId === employeeId
    );

    if (existingEmail && existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Email hoặc số điện thoại đã tồn tại trong hệ thống",
      });
    }

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại trong hệ thống",
      });
    }

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại đã tồn tại trong hệ thống",
      });
    }

    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        message: "Mã cán bộ đã tồn tại trong hệ thống",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString(); // 6-digit code

    // Create new user with unverified status
    const newUser = {
      id: Date.now().toString(),
      employeeId,
      name,
      email,
      phone,
      password: hashedPassword,
      role: "user",
      status: "Chờ xác thực", // Pending verification
      verified: false,
      verificationCode: verificationCode,
      verificationCodeExpiry: new Date(
        Date.now() + 15 * 60 * 1000
      ).toISOString(), // 15 minutes
      department: "",
      position: "",
      gender: "",
      birthDate: "",
      idCard: "",
      address: "",
      unionDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    await writeDB(db);

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationCode, name);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error(
        "⚠️ Email send failed, but user created:",
        emailError.message
      );
      // User still created, just log the error
    }

    res.status(201).json({
      success: true,
      message:
        "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
      data: {
        id: newUser.id,
        employeeId: newUser.employeeId,
        name: newUser.name,
        email: newUser.email,
        message: `Mã xác thực đã được gửi đến ${email}`,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu",
      });
    }

    const db = await readDB();

    // Find user by email or employeeId
    const user = db.users.find(
      (u) => u.email === email || u.employeeId === email
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // Check status
    if (user.status !== "Đang công tác") {
      return res.status(401).json({
        success: false,
        message: "Tài khoản đã bị khóa",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department, // Add department to token for RBAC
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Logging: Successful Login
    const { logAction } = require("../utils/logger");

    // Determine source based on portal param
    let source = "SYSTEM";
    if (portal === "admin") source = "ADMIN_PORTAL";
    else if (portal === "user") source = "USER_PORTAL";
    // Default fallback if no portal param (e.g. from existing user portal)
    else source = "USER_PORTAL";

    await logAction({
      actorId: user.id,
      actorName: user.name,
      actionType: "LOGIN",
      target: "System",
      status: "SUCCESS",
      source: source,
      details: `User logged in via ${
        email === user.email ? "Email" : "EmployeeID"
      }`,
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không có token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = await readDB();
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại",
      });
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
    });
  }
});

// POST /api/auth/verify
router.post("/verify", async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mã xác thực",
      });
    }

    const db = await readDB();
    const userIndex = db.users.findIndex((u) => u.email === email);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    const user = db.users[userIndex];

    // Check if already verified
    if (user.verified) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản đã được xác thực",
      });
    }

    // Check verification code
    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực không đúng",
      });
    }

    // Check expiry
    if (new Date() > new Date(user.verificationCodeExpiry)) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.",
      });
    }

    // Activate account
    db.users[userIndex].verified = true;
    db.users[userIndex].status = "Đang công tác";
    db.users[userIndex].verificationCode = null;
    db.users[userIndex].verificationCodeExpiry = null;

    await writeDB(db);

    res.json({
      success: true,
      message: "Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.",
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// POST /api/auth/resend-verification
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email",
      });
    }

    const db = await readDB();
    const userIndex = db.users.findIndex((u) => u.email === email);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    const user = db.users[userIndex];

    if (user.verified) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản đã được xác thực",
      });
    }

    // Generate new verification code
    const newVerificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    db.users[userIndex].verificationCode = newVerificationCode;
    db.users[userIndex].verificationCodeExpiry = new Date(
      Date.now() + 15 * 60 * 1000
    ).toISOString();

    await writeDB(db);

    // In production, send email/SMS
    console.log(`New verification code for ${email}: ${newVerificationCode}`);

    res.json({
      success: true,
      message: "Mã xác thực mới đã được gửi đến email/SMS của bạn",
      // ONLY FOR DEMO
      data: {
        verificationCode: newVerificationCode,
      },
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email",
      });
    }

    const db = await readDB();
    const user = db.users.find((u) => u.email === email);

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: "Nếu email tồn tại, mã xác thực đã được gửi",
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with reset code
    user.resetCode = resetCode;
    user.resetCodeExpiry = resetCodeExpiry.toISOString();

    await writeDB(db);

    // Send email
    const { sendPasswordResetEmail } = require("../services/emailService");
    await sendPasswordResetEmail(email, resetCode, user.name);

    res.json({
      success: true,
      message: "Mã xác thực đã được gửi đến email của bạn",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// POST /api/auth/reset-password - Reset password with code
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    const db = await readDB();
    const user = db.users.find((u) => u.email === email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại",
      });
    }

    // Check reset code
    if (!user.resetCode || user.resetCode !== code) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực không đúng",
      });
    }

    // Check expiry
    if (new Date() > new Date(user.resetCodeExpiry)) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực đã hết hạn",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear reset code
    delete user.resetCode;
    delete user.resetCodeExpiry;

    await writeDB(db);

    res.json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// PUT /api/auth/change-password - Change password for authenticated user
router.put("/change-password", auth, async (req, res) => {
  try {
    console.log("🔐 Change password request received");
    console.log("User ID from auth:", req.user?.id);

    const { currentPassword, newPassword } = req.body;
    console.log("Has currentPassword:", !!currentPassword);
    console.log("Has newPassword:", !!newPassword);

    if (!currentPassword || !newPassword) {
      console.log("❌ Missing password fields");
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    if (newPassword.length < 6) {
      console.log("❌ New password too short");
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    const db = await readDB();
    const user = db.users.find((u) => u.id === req.user.id);
    console.log("User found:", !!user);

    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Verify current password
    console.log("Verifying current password...");
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("❌ Current password incorrect");
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    // Hash and update new password
    console.log("✅ Password valid, updating...");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await writeDB(db);
    console.log("✅ Password updated successfully");

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

module.exports = router;
