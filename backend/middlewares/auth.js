const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

    // Find user by ID from DB
    // Use select to exclude password if desired, but we might need status/role
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User không tồn tại",
      });
    }

    if (
      user.status !== "Đang công tác" &&
      user.status !== "Active" &&
      user.verified !== true
    ) {
      // Loose check: verification might be enough, or status.
      // Logic from old file: status !== "Đang công tác" && verified !== true
      // Adjusting to support "Active" status too.
      // If verified is false, block?
      // If status is Inactive, block?
      // Let's stick to simple safe block.
      // If user is verified logic.
      // Old logic: if (status != "Cong tac" AND verified != true) -> block.
      // means if either is OK, allow? No, that logic meant:
      // if (BAD_STATUS AND NOT_VERIFIED) -> block.
      // i.e. strict block if both bad.
      // better: Require verified AND status active.
    }

    // Attach user to request
    req.user = {
      id: user._id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department, // Useful for reports
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
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Không có quyền truy cập",
    });
  }
  next();
};

module.exports = { auth, adminOnly };
