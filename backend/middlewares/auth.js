const jwt = require("jsonwebtoken");
const fs = require("fs").promises;
const path = require("path");

const DB_PATH = path.join(__dirname, "../data/users.json");

// Read database
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { users: [] };
  }
}

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không có token xác thực",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const db = await readDB();
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User không tồn tại",
      });
    }

    if (user.status !== "Đang công tác" && user.verified !== true) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản chưa được xác thực hoặc đã bị khóa",
      });
    }

    // Attach user to request (exclude sensitive fields)
    req.user = {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
    });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Không có quyền truy cập",
    });
  }
  next();
};

module.exports = { auth, adminOnly };
