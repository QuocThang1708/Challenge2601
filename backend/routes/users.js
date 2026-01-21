const express = require("express");
const router = express.Router();
const User = require("../models/User");
const JobHistory = require("../models/JobHistory");
const { auth, adminOnly } = require("../middlewares/auth");
const { logAction } = require("../utils/logger");

// GET /api/users - Get all users
router.get("/", auth, async (req, res) => {
  try {
    // Permission check
    // "dept_admin" check logic
    const allowedRoles = ["admin", "superadmin", "dept_admin"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let query = {};
    if (req.user.role === "dept_admin") {
      query.department = req.user.department;
    }

    const users = await User.find(query).select("-password");
    res.json({ success: true, data: users, total: users.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/users/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/users - Create User (Admin)
router.post("/", auth, adminOnly, async (req, res) => {
  try {
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

    // Check existing
    const exists = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });

    const finalPassword = password || "password123";
    const hashedPassword = await require("bcryptjs").hash(finalPassword, 10);

    const newUser = new User({
      name,
      email,
      phone,
      employeeId,
      department,
      position,
      role: role || "user",
      password: hashedPassword,
      status: "Đang công tác",
      unionDate: new Date().toISOString().split("T")[0],
    });

    await newUser.save();

    // Log
    await logAction({
      actorId: req.user.id.toString(),
      actorName: req.user.name,
      actionType: "CREATE_USER",
      target: `User ${newUser.name} (${newUser.employeeId})`,
      status: "SUCCESS",
      source: "ADMIN_PORTAL",
    });

    const userObj = newUser.toObject();
    delete userObj.password;
    res.status(201).json({ success: true, data: userObj });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/users/:id - Update User
router.put("/:id", auth, async (req, res) => {
  try {
    // Permission: Admin only unless verifying self update? usually this route is admin
    if (
      req.user.role !== "admin" &&
      req.user.role !== "superadmin" &&
      req.user.role !== "dept_admin"
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const updates = req.body;
    const user = await User.findById(req.params.id);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // History Tracking
    const trackedFields = [
      { key: "department", label: "Phòng ban", type: "LUAN_CHUYEN" },
      { key: "position", label: "Chức vụ", type: "THANG_CHUC" },
      { key: "status", label: "Trạng thái", type: "THAY_DOI_TRANG_THAI" },
    ];

    let historyAdded = false;
    for (const { key, label, type } of trackedFields) {
      if (updates[key] !== undefined && updates[key] !== user[key]) {
        await JobHistory.create({
          userId: user._id, // Using ObjectId link
          type,
          fieldName: label,
          oldValue: user[key],
          newValue: updates[key],
          updaterId: req.user.id,
          note: updates.note || "",
        });
        historyAdded = true;
      }
    }

    // Update Fields
    // Exclude sensitive manually if needed, but assuming body payload is clean
    delete updates.password;
    delete updates.id;
    delete updates._id;

    // Direct update
    Object.assign(user, updates);
    await user.save();

    // Log
    await logAction({
      actorId: req.user.id.toString(),
      actorName: req.user.name,
      actionType: "UPDATE_USER",
      target: `User ID ${req.params.id}`,
      status: "SUCCESS",
      source: "ADMIN_PORTAL",
      details: historyAdded ? "Detected Job History Change" : "Update Profile",
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/users/:id/history
router.get("/:id/history", auth, async (req, res) => {
  try {
    // Find history by userId (ObjectId or String depending on how stored)
    // We saved as ObjectId in PUT above. Migration saved as String ID.
    // Query both to be safe or assuming consistent ID if migrated correctly?
    // Migration: kept IDs as strings in some cases?
    // Let's query by String conversion? Or just straight match if using Mongoose IDs.
    // Migration logic used `_id` auto gen if not provided.
    // JobHistory migration copied `userId` as is (likely string "170...").
    // User migration: we generated new ObjectIds (default) or used string?
    // In migration script I used `_id: u.id ...`.
    const history = await JobHistory.find({ userId: req.params.id }).sort({
      timestamp: -1,
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Log
    await logAction({
      actorId: req.user.id.toString(),
      actorName: req.user.name,
      actionType: "DELETE_USER",
      target: `User ID ${req.params.id}`,
      status: "SUCCESS",
      source: "ADMIN_PORTAL",
    });

    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PATCH /api/users/:id/status
router.patch("/:id/status", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    await logAction({
      actorId: req.user.id.toString(),
      actorName: req.user.name,
      actionType: "UPDATE_STATUS",
      target: `User ID ${req.params.id} -> ${status}`,
      status: "SUCCESS",
      source: "ADMIN_PORTAL",
    });

    res.json({ success: true, message: "Status updated", data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
