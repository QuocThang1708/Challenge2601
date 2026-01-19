const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const jwt = require("jsonwebtoken");

const USERS_PATH = path.join(__dirname, "../data/users.json");

// Auth middleware
async function authMiddleware(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

// Read/Write helpers
async function readUsers() {
  const data = await fs.readFile(USERS_PATH, "utf8");
  return JSON.parse(data);
}

async function writeUsers(data) {
  await fs.writeFile(USERS_PATH, JSON.stringify(data, null, 2));
}

// GET /api/profile - Get current user profile
router.get("/", authMiddleware, async (req, res) => {
  try {
    const db = await readUsers();
    const user = db.users.find((u) => u.id === req.userId);

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

// PUT /api/profile - Update current user profile
router.put("/", authMiddleware, async (req, res) => {
  try {
    const db = await readUsers();
    const index = db.users.findIndex((u) => u.id === req.userId);

    if (index === -1) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update user data (don't allow changing id, password, role)
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
        db.users[index][field] = req.body[field];
      }
    });

    await writeUsers(db);

    const { password, ...userWithoutPassword } = db.users[index];
    res.json({
      success: true,
      message: "Cập nhật profile thành công",
      data: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const multer = require("multer");

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/avatars");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error("Error creating upload directory:", error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Chỉ chấp nhận file ảnh (JPG, PNG, GIF)"));
    }
    cb(null, true);
  },
});

// POST /api/profile/avatar - Upload avatar
router.post(
  "/avatar",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "Vui lòng chọn ảnh" });
      }

      const db = await readUsers();
      const index = db.users.findIndex((u) => u.id === req.userId);

      if (index === -1) {
        await fs.unlink(req.file.path).catch(() => {});
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Delete old avatar if exists
      if (db.users[index].avatar) {
        const oldPath = path.join(__dirname, "..", db.users[index].avatar);
        // Check if it's a file path we can delete (not a URL)
        if (!db.users[index].avatar.startsWith("http")) {
          await fs.unlink(oldPath).catch(() => {});
        }
      }

      // Update user record - Store relative path for serving
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      db.users[index].avatar = avatarUrl;

      await writeUsers(db);

      const { password, ...userWithoutPassword } = db.users[index];

      res.json({
        success: true,
        message: "Cập nhật ảnh đại diện thành công",
        data: {
          avatar: avatarUrl,
          user: userWithoutPassword,
        },
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res
        .status(500)
        .json({ success: false, message: "Lỗi upload ảnh: " + error.message });
    }
  }
);

module.exports = router;
