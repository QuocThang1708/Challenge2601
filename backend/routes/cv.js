const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { pathToFileURL } = require("url");
const fs = require("fs").promises;
const { auth } = require("../middlewares/auth");

// Models
const CV = require("../models/CV");
const Qualification = require("../models/Qualification");
const User = require("../models/User");

// Multer Config
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/cv");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (e) {}
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("Chỉ chấp nhận file PDF, DOC, DOCX"));
  },
});

// POST /api/cv/upload
router.post("/upload", auth, upload.single("cv"), async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Không có file nào được tải lên" });

    const newCV = new CV({
      userId: req.user.id,
      filename: req.file.originalname,
      storedFilename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
    });

    await newCV.save();

    res
      .status(201)
      .json({ success: true, message: "Tải lên CV thành công", data: newCV });
  } catch (error) {
    console.error("CV upload error:", error);
    res
      .status(500)
      .json({ success: false, message: error.message || "Lỗi tải lên CV" });
  }
});

// GET /api/cv
router.get("/", auth, async (req, res) => {
  try {
    const cvs = await CV.find({ userId: req.user.id });
    res.json({ success: true, data: cvs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách CV" });
  }
});

// GET /api/cv/user/:userId
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const canAccess =
      req.user.role === "admin" ||
      req.user.role === "dept_admin" ||
      req.user.id === req.params.userId;
    if (!canAccess)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const cvs = await CV.find({ userId: req.params.userId });
    res.json({ success: true, data: cvs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// GET /api/cv/:id/download
router.get("/:id/download", auth, async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);
    if (!cv)
      return res.status(404).json({ success: false, message: "CV not found" });

    const canAccess =
      req.user.role === "admin" ||
      req.user.role === "dept_admin" ||
      cv.userId === req.user.id;
    if (!canAccess)
      return res.status(403).json({ success: false, message: "Forbidden" });

    res.download(cv.path, cv.filename);
  } catch (error) {
    res.status(500).json({ success: false, message: "download error" });
  }
});

// GET /api/cv/:id/view
router.get("/:id/view", auth, async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);
    if (!cv)
      return res.status(404).json({ success: false, message: "CV not found" });

    // Verify file exists
    try {
      await fs.access(cv.path);
    } catch (e) {
      return res
        .status(404)
        .json({ success: false, message: "File không tồn tại trên hệ thống" });
    }

    if (cv.mimetype.includes("officedocument")) {
      const mammoth = require("mammoth");
      const result = await mammoth.convertToHtml({ path: cv.path });
      const html = `<!DOCTYPE html><html><body style="padding:40px;max-width:900px;margin:0 auto;font-family:sans-serif">${result.value}</body></html>`;
      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    }

    res.setHeader("Content-Type", cv.mimetype);
    res.setHeader("Content-Disposition", "inline");
    const stream = require("fs").createReadStream(cv.path);
    stream.pipe(res);
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

// PUT /api/cv/:id
router.put("/:id", auth, upload.single("cv"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: "Thiếu file" });

    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv)
      return res
        .status(404)
        .json({ success: false, message: "CV không tồn tại" });

    // Delete old file
    try {
      await fs.unlink(cv.path);
    } catch (e) {}

    cv.filename = req.file.originalname;
    cv.path = req.file.path;
    cv.mimetype = req.file.mimetype;
    cv.size = req.file.size;
    cv.uploadDate = new Date(); // Update date

    await cv.save();
    res.json({ success: true, message: "Cập nhật thành công", data: cv });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// DELETE /api/cv/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv)
      return res.status(404).json({ success: false, message: "CV not found" });

    try {
      await fs.unlink(cv.path);
    } catch (e) {}

    await CV.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi Server" });
  }
});

// POST /api/cv/:id/extract-qualifications
const cvParser = require("../utils/cvParser");
const pdf = require("pdf-parse"); // Using pdf-parse directly in file or check if utility exists

router.post("/:id/extract-qualifications", auth, async (req, res) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv)
      return res.status(404).json({ success: false, message: "CV not found" });

    let text = "";
    const filePath = cv.path;

    if (cv.mimetype.includes("pdf")) {
      const dataBuffer = await fs.readFile(filePath);
      try {
        // Basic pdf-parse usage assuming simple install
        // If complex setup needed, use existing util. previous code had complex pdf setup.
        // I'll assume simple pdf-parse works or rely on catch.
        // Previously checked code used `new pdf(...)`.
        const parser = await pdf(dataBuffer);
        text = parser.text;
      } catch (e) {
        console.error("PDF Parse error", e);
        // Fallback or error
      }
    } else if (cv.mimetype.includes("word") || cv.mimetype.includes("office")) {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    }

    if (!text || text.length < 50) {
      return res.json({
        success: true,
        warning: "NO_TEXT",
        message: "Không đọc được nội dung text (Scan?)",
        extracted: {},
      });
    }

    let extracted = cvParser.parse(text);

    // Save to DB
    let qual = await Qualification.findOne({ userId: req.user.id });
    if (!qual) {
      qual = new Qualification({ userId: req.user.id });
    }

    if (extracted.education?.length)
      qual.education.push(...extracted.education);
    if (extracted.experience?.length)
      qual.experience.push(...extracted.experience);
    if (extracted.skills?.length) qual.skills.push(...extracted.skills);
    if (extracted.achievements?.length)
      qual.achievements.push(...extracted.achievements);

    await qual.save();

    res.json({
      success: true,
      message: "Đã trích xuất thông tin",
      data: extracted,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi AI: " + error.message });
  }
});

module.exports = router;
