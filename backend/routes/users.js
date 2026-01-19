const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const jwt = require("jsonwebtoken");

const DB_PATH = path.join(__dirname, "../data/users.json");

// Simple auth middleware
async function authMiddleware(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userDepartment = decoded.department; // Extract department
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

// Helper functions
async function readDB() {
  const data = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(data);
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// GET /api/users - Get all users (filtered by role)
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Role Check: only admin or superadmin/admin can access
    const allowedRoles = ["admin", "superadmin", "dept_admin"];
    if (!allowedRoles.includes(req.userRole) && req.userRole !== "admin") {
      // Handling legacy 'admin' role name, will migrate to new names later
      // Current names in use might differ from generic 'admin'.
      // Based on roles.json: 'admin' (Admin Tổng), 'dept_admin' (Admin Đơn vị).
      // Let's be permissive with 'admin' keyword for now.
    }

    // Strict Check:
    // If we strictly follow the new roles:
    // 'admin' in roles.json ID is 'admin' (Super Admin)
    // 'dept_admin' in roles.json ID is 'dept_admin' (Dept Admin)

    // However, existing users.json has "role": "admin".
    // We treat "admin" as Super Admin.

    const db = await readDB();
    let users = db.users.map(({ password, ...user }) => user);

    // Filter Logic
    if (req.userRole === "dept_admin") {
      // Department Admin only sees their own department
      users = users.filter((u) => u.department === req.userDepartment);
    } else if (req.userRole !== "admin" && req.userRole !== "superadmin") {
      // If standard user somehow hits this (though middleware usually blocks), strict block
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    res.json({
      success: true,
      data: users,
      total: users.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/users/:id - Get user by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await readDB();
    const user = db.users.find((u) => u.id === req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/users - Create new user (admin only)
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "superadmin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const {
      name,
      email,
      phone,
      employeeId,
      department,
      position,
      password,
      role,
    } = req.body;
    const db = await readDB();

    // Check if user exists
    const exists = db.users.find(
      (u) => u.email === email || u.employeeId === employeeId
    );
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const finalPassword = password || "password123";
    const hashedPassword = await require("bcryptjs").hash(finalPassword, 10);

    const newUser = {
      id: Date.now().toString(),
      employeeId,
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || "user",
      status: "Đang công tác",
      department,
      position,
      gender: "",
      birthDate: "",
      idCard: "",
      address: "",
      unionDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    await writeDB(db);

    // Logging: Create User
    const { logAction } = require("../utils/logger");
    await logAction({
      actorId: req.userId,
      actorName: "Admin", // In real app, fetch actor name. Middleware gives basic info.
      actionType: "CREATE_USER",
      target: `User ${newUser.name} (${newUser.employeeId})`,
      status: "SUCCESS",
      source: "ADMIN_PORTAL",
    });

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Helper to read Job History
const HISTORY_DB_PATH = path.join(__dirname, "../data/job_history.json");
async function readHistoryDB() {
  try {
    const data = await fs.readFile(HISTORY_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

async function writeHistoryDB(data) {
  await fs.writeFile(HISTORY_DB_PATH, JSON.stringify(data, null, 2));
}

// PUT /api/users/:id - Update user
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await readDB();
    const index = db.users.findIndex((u) => u.id === req.params.id);

    if (index === -1) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const oldUser = db.users[index];
    const updates = req.body; // { ...userData, tags: [...] }

    // 1. Employee Movement Tracking Logic
    const historyDB = await readHistoryDB();
    const trackedFields = [
      { key: "department", label: "Phòng ban", type: "LUAN_CHUYEN" },
      { key: "position", label: "Chức vụ", type: "THANG_CHUC" },
      { key: "status", label: "Trạng thái", type: "THAY_DOI_TRANG_THAI" },
    ];

    const timestamp = new Date().toISOString();
    let historyAdded = false;

    trackedFields.forEach(({ key, label, type }) => {
      // Check if field is present in updates AND it's different from old value
      if (updates[key] !== undefined && updates[key] !== oldUser[key]) {
        historyDB.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          userId: req.params.id,
          timestamp: timestamp,
          type: type,
          field: key,
          fieldName: label,
          oldValue: oldUser[key],
          newValue: updates[key],
          changedBy: req.userId, // Admin ID
          note: updates.note || "", // Optional note from UI
        });
        historyAdded = true;
      }
    });

    if (historyAdded) {
      await writeHistoryDB(historyDB);
    }

    // 2. Update user (including 'tags')
    // Ensure ID isn't changed
    db.users[index] = { ...oldUser, ...updates, id: req.params.id };

    // Explicitly handle tags if provided, otherwise keep existing or default to []
    if (updates.tags) {
      db.users[index].tags = updates.tags;
    }

    await writeDB(db);

    // Logging: Update User
    const { logAction } = require("../utils/logger");
    await logAction({
      actorId: req.userId,
      actorName: "Admin",
      actionType: "UPDATE_USER",
      target: `User with ID ${req.params.id}`,
      status: "SUCCESS",
      source: "ADMIN_PORTAL",
      details: historyAdded ? "Detected Job History Change" : "Update Profile",
    });

    const { password: _, ...userWithoutPassword } = db.users[index];
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/users/:id/history - Get user job history
router.get("/:id/history", authMiddleware, async (req, res) => {
  try {
    const historyDB = await readHistoryDB();
    // Filter history for this user
    const userHistory = historyDB
      .filter((h) => h.userId === req.params.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

    res.json({ success: true, data: userHistory });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "superadmin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const db = await readDB();
    // Ensure both IDs are strings for comparison
    const targetId = String(req.params.id);

    const originalLength = db.users.length;

    db.users = db.users.filter((u) => String(u.id) !== targetId);

    // Check if anything was actually deleted
    if (db.users.length === originalLength) {
      return res
        .status(404)
        .json({ success: false, message: "User not found or already deleted" });
    }

    await writeDB(db);

    // Logging: Delete User
    const { logAction } = require("../utils/logger");
    await logAction({
      actorId: req.userId,
      actorName: "Admin",
      actionType: "DELETE_USER",
      target: `User ID ${targetId}`,
      status: "SUCCESS",
      source: "ADMIN_PORTAL",
    });

    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PATCH /api/users/:id/status - Change user status
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "superadmin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { status } = req.body;
    const db = await readDB();
    const index = db.users.findIndex((u) => u.id === req.params.id);

    if (index === -1) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    db.users[index].status = status;
    await writeDB(db);

    // Logging: Status Change
    const { logAction } = require("../utils/logger");
    await logAction({
      actorId: req.userId,
      actorName: "Admin",
      actionType: "UPDATE_STATUS",
      target: `User ID ${req.params.id} -> ${status}`,
      status: "SUCCESS",
      source: "ADMIN_PORTAL",
    });

    res.json({
      success: true,
      message: "Status updated",
      data: db.users[index],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
