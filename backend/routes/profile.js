const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { auth } = require("../middlewares/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises; // Used for file operations (Avatar)

// GET /api/profile
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/profile
router.put("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const allowedFields = [
      "name",
      "email",
      "phone",
      "gender",
      "birthDate",
      "idCard",
      "address",
      "department",
      "position",
      "unionDate",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    // Return updated
    const userObj = user.toObject();
    delete userObj.password;
    res.json({
      success: true,
      message: "Cập nhật profile thành công",
      data: userObj,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Multer Config
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/avatars");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (e) {}
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Chỉ chấp nhận file ảnh"));
    cb(null, true);
  },
});

// POST /api/profile/avatar
router.post("/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn ảnh" });

    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Delete old avatar
    if (user.avatar && !user.avatar.startsWith("http")) {
      const oldPath = path.join(__dirname, "..", user.avatar);
      try {
        await fs.unlink(oldPath);
      } catch (e) {}
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarUrl;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      data: { avatar: avatarUrl, user: userObj },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi upload ảnh: " + error.message });
  }
});

module.exports = router;
