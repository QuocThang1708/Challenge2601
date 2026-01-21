const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { auth } = require("../middlewares/auth");

// Models
const CV = require("../models/CV");
const Qualification = require("../models/Qualification");
const User = require("../models/User");

// Utils
const cvParser = require("../utils/cvParser");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

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
    // Fix UTF-8 encoding for originalname
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8",
    );
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

// Helper: Extract Text from File
async function extractTextFromFile(filePath, mimetype) {
  try {
    if (mimetype.includes("pdf")) {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } else if (mimetype.includes("word") || mimetype.includes("office")) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
  } catch (err) {
    console.error("Text extraction failed:", err);
  }
  return "";
}

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

    // --- AUTO EXTRACT QUALIFICATIONS ---
    const text = await extractTextFromFile(req.file.path, req.file.mimetype);
    if (text && text.length > 50) {
      const extracted = cvParser.parse(text);
      if (
        extracted.education.length ||
        extracted.experience.length ||
        extracted.skills.length
      ) {
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
      }
    }
    // -----------------------------------

    res.status(201).json({
      success: true,
      message: "Tải lên CV & Trích xuất tự động thành công",
      data: newCV,
    });
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

    // Validate path
    // If path is stored as absolute local path from previous deploy, it might be wrong.
    // Try to resolve it relative to current uploads dir if possible, or trust db.
    let filePath = cv.path;
    try {
      await fs.access(filePath);
    } catch (e) {
      return res.status(404).json({
        success: false,
        message: "File gốc không còn tồn tại trên server (có thể do redeploy)",
      });
    }

    res.download(filePath, cv.filename);
  } catch (error) {
    res.status(500).json({ success: false, message: "Download error" });
  }
});

// GET /api/cv/:id/view
router.get("/:id/view", auth, async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);
    if (!cv)
      return res.status(404).json({ success: false, message: "CV not found" });

    // Fix check file exist
    let filePath = cv.path;
    try {
      await fs.access(filePath);
    } catch (e) {
      return res
        .status(404)
        .json({ success: false, message: "File không tồn tại (Disk Missing)" });
    }

    if (
      cv.mimetype.includes("officedocument") ||
      cv.mimetype.includes("word") ||
      cv.filename.endsWith("docx") ||
      cv.filename.endsWith("doc")
    ) {
      const mammoth = require("mammoth");
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = `<!DOCTYPE html><html><body style="padding:40px;max-width:900px;margin:0 auto;font-family:sans-serif;line-height:1.6">${result.value}</body></html>`;
      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    }

    res.setHeader("Content-Type", cv.mimetype);
    res.setHeader("Content-Disposition", "inline");
    const stream = require("fs").createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error("View CV Error:", error);
    res.status(500).send("Server Error: " + error.message);
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

// POST /api/cv/:id/extract-qualifications (Manual Trigger)
router.post("/:id/extract-qualifications", auth, async (req, res) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv)
      return res.status(404).json({ success: false, message: "CV not found" });

    // Validate path
    try {
      await fs.access(cv.path);
    } catch (e) {
      return res
        .status(404)
        .json({
          success: false,
          message: "File gốc không còn tồn tại để scan",
        });
    }

    const text = await extractTextFromFile(cv.path, cv.mimetype);

    if (!text || text.length < 50) {
      return res.json({
        success: true,
        warning: "NO_TEXT",
        message: "Không đọc được nội dung text (Scan?)",
        extracted: {},
      });
    }

    const extracted = cvParser.parse(text);

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
      message: "Đã trích xuất thông tin (Manual)",
      data: extracted,
    });
  } catch (error) {
    console.error("Manual Extract Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi AI: " + error.message });
  }
});

module.exports = router;
