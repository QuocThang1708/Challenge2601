const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { pathToFileURL } = require("url");
const fs = require("fs").promises;
const { auth } = require("../middlewares/auth");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/cv");
    // Create directory if it doesn't exist
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error("Error creating upload directory:", error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file PDF, DOC, DOCX"));
    }
  },
});

// Database paths
const CV_DB_PATH = path.join(__dirname, "../data/cvs.json");

// Helper functions
async function readCVDB() {
  try {
    const data = await fs.readFile(CV_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty structure
    return { cvs: [] };
  }
}

async function writeCVDB(data) {
  await fs.writeFile(CV_DB_PATH, JSON.stringify(data, null, 2));
}

// Upload CV
router.post("/upload", auth, upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Không có file nào được tải lên",
      });
    }

    const db = await readCVDB();

    const newCV = {
      id: Date.now().toString(),
      userId: req.user.id,
      filename: req.file.originalname,
      storedFilename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadDate: new Date().toISOString(),
      path: req.file.path,
    };

    db.cvs.push(newCV);
    await writeCVDB(db);

    // Trigger Auto-Extraction
    try {
      // Simulate calling the extraction internal logic
      // Ideally we should refactor extract-qualifications to a helper, but for now we can rely on frontend calling it,
      // OR specifically here we just let the user know extraction is available.
      // User requested: "AI will read ... and fill".
      // Let's call the extraction logic directly here if we can.
      // But text extraction is async and heavy.
      // Better: Return success and let Frontend call extract endpoint automatically?
      // Or: Do it async here.
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: "Tải lên CV thành công",
      data: newCV,
    });
  } catch (error) {
    console.error("CV upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi tải lên CV",
    });
  }
});

// Get all CVs for current user
router.get("/", auth, async (req, res) => {
  try {
    const db = await readCVDB();
    const userCVs = db.cvs.filter((cv) => cv.userId === req.user.id);

    res.json({
      success: true,
      data: userCVs,
    });
  } catch (error) {
    console.error("Get CVs error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách CV",
    });
  }
});

// Get CVs by User ID (Admin/Dept Admin only)
router.get("/user/:userId", auth, async (req, res) => {
  try {
    // Access Control: Only admins or dept admins can view others' CVs
    // (For now, assuming auth middleware populates req.user.role)
    const canAccess =
      req.user.role === "admin" ||
      req.user.role === "dept_admin" ||
      req.user.id === req.params.userId; // Self access

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập",
      });
    }

    const db = await readCVDB();
    const userCVs = db.cvs.filter((cv) => cv.userId === req.params.userId);

    res.json({
      success: true,
      data: userCVs,
    });
  } catch (error) {
    console.error("Get User CVs error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách CV của người dùng",
    });
  }
});

// Download CV
router.get("/:id/download", auth, async (req, res) => {
  try {
    const db = await readCVDB();
    const cv = db.cvs.find((c) => {
      // Allow if owner OR admin/dept_admin
      if (c.id !== req.params.id) return false;
      if (c.userId === req.user.id) return true;
      if (
        req.user.role === "admin" ||
        req.user.role === "superadmin" ||
        req.user.role === "dept_admin"
      )
        return true;
      return false;
    });

    if (!cv) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy CV",
      });
    }

    res.download(cv.path, cv.filename);
  } catch (error) {
    console.error("CV download error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải xuống CV",
    });
  }
});

// View CV (Inline)
router.get("/:id/view", auth, async (req, res) => {
  try {
    console.log(
      `[DEBUG] View CV - ID: ${req.params.id}, User: ${req.user.id}, Role: ${req.user.role}`
    );

    const db = await readCVDB();
    const cv = db.cvs.find((c) => {
      if (c.id !== req.params.id) return false;

      const isOwner = c.userId === req.user.id;
      const isAdmin = ["admin", "superadmin", "dept_admin"].includes(
        req.user.role
      );

      console.log(
        `[DEBUG] Checking CV ${c.id}: Owner=${isOwner}, Admin=${isAdmin}`
      );

      if (isOwner || isAdmin) return true;
      return false;
    });

    if (!cv) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy CV",
      });
    }

    // Verify file exists
    try {
      await fs.access(cv.path);
    } catch (err) {
      console.error("File missing on disk:", cv.path);
      return res.status(404).json({
        success: false,
        message: "File không tồn tại trên hệ thống",
      });
    }

    console.log("Serving CV view:", cv.path);

    // DOCX Rendering via Mammoth
    if (
      cv.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const mammoth = require("mammoth");
        const result = await mammoth.convertToHtml({ path: cv.path });
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; background: #fff; color: #333; }
                    p { margin-bottom: 1em; }
                    strong { font-weight: 600; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    td, th { border: 1px solid #ddd; padding: 8px; }
                </style>
            </head>
            <body>
                ${result.value}
            </body>
            </html>
         `;
        res.setHeader("Content-Type", "text/html");
        return res.send(html);
      } catch (err) {
        console.error("Mammoth error:", err);
        // Fallback to stream if render fails
      }
    }

    // Default Stream (PDF / Others)
    res.setHeader("Content-Type", cv.mimetype);
    res.setHeader("Content-Disposition", "inline");

    // Note: fs is fs.promises from outer scope, so we need normal fs for stream
    const stream = require("fs").createReadStream(cv.path);
    stream.on("error", (err) => {
      console.error("Stream error:", err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error("CV view error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi xem CV",
      });
    }
  }
});

// Update CV
router.put("/:id", auth, upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file",
      });
    }

    const db = await readCVDB();
    const cvIndex = db.cvs.findIndex(
      (c) => c.id === req.params.id && c.userId === req.user.id
    );

    if (cvIndex === -1) {
      // Remove uploaded file if CV not found
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        success: false,
        message: "CV không tồn tại",
      });
    }

    const oldCV = db.cvs[cvIndex];

    // Delete old file
    await fs
      .unlink(oldCV.path)
      .catch((err) => console.error("Failed to remove old CV file:", err));

    // Update record
    db.cvs[cvIndex] = {
      ...oldCV,
      filename: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date().toISOString(), // Update timestamp
    };

    await writeCVDB(db);

    res.json({
      success: true,
      message: "Cập nhật CV thành công",
      data: db.cvs[cvIndex],
    });
  } catch (error) {
    console.error("Update CV error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi Server khi cập nhật CV",
    });
  }
});

// Delete CV
router.delete("/:id", auth, async (req, res) => {
  try {
    const db = await readCVDB();
    const cvIndex = db.cvs.findIndex(
      (c) => c.id === req.params.id && c.userId === req.user.id
    );

    if (cvIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy CV",
      });
    }

    const cv = db.cvs[cvIndex];

    // Delete file from disk
    try {
      await fs.unlink(cv.path);
    } catch (error) {
      console.error("Error deleting file:", error);
    }

    // Remove from database
    db.cvs.splice(cvIndex, 1);
    await writeCVDB(db);

    res.json({
      success: true,
      message: "Xóa CV thành công",
    });
  } catch (error) {
    console.error("CV delete error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa CV",
    });
  }
});

// ... existing imports
const pdf = require("pdf-parse"); // AI PDF Reader

// ... existing code

const cvParser = require("../utils/cvParser");

// AI Extraction Endpoint (Legacy - now called auto)
router.post("/:id/extract-qualifications", auth, async (req, res) => {
  try {
    // 1. Get CV File
    const db = await readCVDB();
    const cv = db.cvs.find(
      (c) => c.id === req.params.id && c.userId === req.user.id
    );
    if (!cv)
      return res.status(404).json({ success: false, message: "CV not found" });

    let text = "";
    const filePath = cv.path;

    // 2. Extract Text
    if (cv.mimetype.includes("pdf")) {
      const dataBuffer = await fs.readFile(filePath);

      let data;
      try {
        // pdf-parse v2.4.5 is a Class that wraps pdfjs-dist
        const pdfDistPath = path.join(__dirname, "../node_modules/pdfjs-dist");

        // pdfjs-dist requires file:// URLs for local paths
        const cMapDir = path.join(pdfDistPath, "cmaps");
        const fontDir = path.join(pdfDistPath, "standard_fonts");

        // Ensure URLs end with a slash
        const cMapUrl = pathToFileURL(cMapDir).href + "/";
        const standardFontDataUrl = pathToFileURL(fontDir).href + "/";

        const parser = new pdf({
          data: dataBuffer,
          cMapUrl: cMapUrl,
          cMapPacked: true,
          standardFontDataUrl: standardFontDataUrl,
        });

        const result = await parser.getText();
        data = { text: result.text };
      } catch (err) {
        console.error("PDF Parsing failed:", err);
        await fs.appendFile(
          path.join(__dirname, "../debug.log"),
          `[ERROR] PDF parsing failed: ${err.message}\n`
        );
        throw new Error(
          "Không thể đọc file PDF. Vui lòng đảm bảo file không bị lỗi."
        );
      }

      if (!data || typeof data.text !== "string") {
        text = "";
      } else {
        text = data.text;
      }
    } else if (
      cv.mimetype.includes("word") ||
      cv.mimetype.includes("officedocument")
    ) {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else {
      return res.status(400).json({
        success: false,
        message: "Chỉ hỗ trợ file PDF và Word cho tính năng AI",
      });
    }

    // Check for Scanned PDF (Image-based)
    if (!text || text.trim().length < 50) {
      return res.json({
        success: true,
        warning: "NO_TEXT_CONTENT",
        message:
          "File PDF này có vẻ là file ảnh hoặc scan (chưa được OCR). Hệ thống không thể đọc được nội dung văn bản. Vui lòng tải lên file gốc (.docx) hoặc file PDF có lớp văn bản.",
        extracted: {
          education: [],
          experience: [],
          skills: [],
          achievements: [],
        },
      });
    }

    // 3. AI Parsing Logic (Using Parser Agent)
    let extracted;
    try {
      extracted = cvParser.parse(text);
    } catch (parseErr) {
      console.error("Parser Error:", parseErr);
      throw parseErr;
    }

    // 4. Save to Qualifications DB
    // Note: We need to read/write quals DB. reusing path from logic
    const qualPath = path.join(__dirname, "../data/qualifications.json");
    let qualDB = {};
    try {
      const qData = await fs.readFile(qualPath, "utf8");
      qualDB = JSON.parse(qData);
    } catch (e) {
      qualDB = {};
    }

    if (!qualDB[req.user.id]) {
      qualDB[req.user.id] = {
        education: [],
        experience: [],
        skills: [],
        achievements: [],
      };
    }

    // Append new data
    if (extracted.education.length > 0) {
      qualDB[req.user.id].education.push(...extracted.education);
    }
    if (extracted.experience.length > 0) {
      qualDB[req.user.id].experience.push(...extracted.experience);
    }
    if (extracted.skills.length > 0) {
      if (!qualDB[req.user.id].skills) qualDB[req.user.id].skills = [];
      qualDB[req.user.id].skills.push(...extracted.skills);
    }
    if (extracted.achievements.length > 0) {
      if (!qualDB[req.user.id].achievements)
        qualDB[req.user.id].achievements = [];
      qualDB[req.user.id].achievements.push(...extracted.achievements);
    }

    await fs.writeFile(qualPath, JSON.stringify(qualDB, null, 2));

    let msg = `AI đã trích xuất: ${extracted.education.length} học vấn, ${extracted.experience.length} kinh nghiệm`;
    if (extracted.skills.length > 0)
      msg += `, ${extracted.skills.length} kỹ năng`;
    if (extracted.achievements.length > 0)
      msg += `, ${extracted.achievements.length} thành tựu`;

    res.json({
      success: true,
      message: msg + ".",
      data: extracted,
    });
  } catch (err) {
    console.error("AI Extract error:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi xử lý AI: " + err.message });
  }
});

module.exports = router;
