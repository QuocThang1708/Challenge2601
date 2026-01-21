const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");
const { auth } = require("../middlewares/auth");
const { logAction } = require("../utils/logger");

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

    // Validation
    if (!name || !email || !password || !employeeId || !phone) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Vui lòng điền đầy đủ: Họ tên, Email, Mã cán bộ, Số điện thoại, Mật khẩu",
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res
        .status(400)
        .json({ success: false, message: "Email không hợp lệ" });

    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(phone))
      return res
        .status(400)
        .json({
          success: false,
          message: "Số điện thoại không hợp lệ (phải là số Việt Nam 10 chữ số)",
        });

    if (password.length < 6)
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự" });

    // Check duplicates
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { employeeId }],
    });

    if (existingUser) {
      if (existingUser.email === email)
        return res
          .status(400)
          .json({ success: false, message: "Email đã tồn tại" });
      if (existingUser.phone === phone)
        return res
          .status(400)
          .json({ success: false, message: "Số điện thoại đã tồn tại" });
      if (existingUser.employeeId === employeeId)
        return res
          .status(400)
          .json({ success: false, message: "Mã cán bộ đã tồn tại" });
    }

    // Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const newUser = new User({
      employeeId,
      name,
      email,
      phone,
      password: hashedPassword,
      role: "user",
      status: "Chờ xác thực",
      verified: false,
      verificationCode,
      verificationCodeExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      department,
      position,
      gender,
      birthDate,
      idCard: "",
      address: "",
      unionDate: new Date().toISOString().split("T")[0],
    });

    await newUser.save();

    // Send Email
    try {
      await sendVerificationEmail(email, verificationCode, name);
    } catch (e) {
      console.error("Email send failed:", e.message);
    }

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực.",
      data: {
        id: newUser._id,
        email: newUser.email,
        message: `Mã xác thực đã gửi đến ${email}`,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, portal } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu email hoặc mật khẩu" });

    // Find by email or employeeId
    const user = await User.findOne({
      $or: [{ email: email }, { employeeId: email }],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ success: false, message: "Email hoặc mật khẩu không đúng" });
    }

    if (user.status !== "Đang công tác" && user.status !== "Active") {
      return res
        .status(401)
        .json({
          success: false,
          message: "Tài khoản bị khóa hoặc chưa kích hoạt",
        });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        department: user.department,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    // Logging
    let source =
      portal === "admin"
        ? "ADMIN_PORTAL"
        : portal === "user"
          ? "USER_PORTAL"
          : "SYSTEM";
    await logAction({
      actorId: user._id.toString(),
      actorName: user.name,
      actionType: "LOGIN",
      target: "System",
      status: "SUCCESS",
      source,
      details: `Logged in via ${email === user.email ? "Email" : "EmployeeID"}`,
    });

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: { user: userObj, token },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Không có token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User không tồn tại" });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(401).json({ success: false, message: "Token không hợp lệ" });
  }
});

// POST /api/auth/verify
router.post("/verify", async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    if (!email || !verificationCode)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tài khoản" });

    if (user.verified)
      return res
        .status(400)
        .json({ success: false, message: "Tài khoản đã xác thực" });
    if (user.verificationCode !== verificationCode)
      return res
        .status(400)
        .json({ success: false, message: "Mã xác thực sai" });
    if (
      user.verificationCodeExpiry &&
      new Date() > user.verificationCodeExpiry
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Mã xác thực hết hạn" });
    }

    user.verified = true;
    user.status = "Đang công tác";
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "Xác thực thành công!" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// POST /api/auth/resend-verification
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tài khoản" });
    if (user.verified)
      return res.status(400).json({ success: false, message: "Đã xác thực" });

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newCode;
    user.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Send email logic (mock or real)
    // await sendVerificationEmail(email, newCode, user.name);

    res.json({
      success: true,
      message: "Mã mới đã gửi",
      data: { verificationCode: newCode },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success for security (unless dev)
    if (!user)
      return res.json({
        success: true,
        message: "Mã xác thực đã gửi (nếu email đúng)",
      });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail(email, code, user.name);
    res.json({ success: true, message: "Mã xác thực đã gửi" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Email không đúng" });

    if (user.resetCode !== code)
      return res.status(400).json({ success: false, message: "Mã sai" });
    if (user.resetCodeExpiry && new Date() > user.resetCodeExpiry)
      return res.status(400).json({ success: false, message: "Mã hết hạn" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "Đặt lại mật khẩu thành công" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// PUT /api/auth/change-password
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu cũ không đúng" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
