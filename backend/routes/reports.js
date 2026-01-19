const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const jwt = require("jsonwebtoken");

const USERS_PATH = path.join(__dirname, "../data/users.json");
const REPORTS_PATH = path.join(__dirname, "../data/reports.json");
const HISTORY_PATH = path.join(__dirname, "../data/job_history.json");

// Helper: Read/Write DB
async function readDB(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      if (filePath === REPORTS_PATH) return { reports: [] };
      if (filePath === HISTORY_PATH) return []; // Array
      return { users: [] };
    }
    throw error;
  }
}

async function writeDB(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Auth middleware
async function authMiddleware(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userName = decoded.name || "Admin"; // Fallback
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

// POST /api/reports/generate - Generate & Save Report
router.post("/generate", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "superadmin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { reportType, dateFrom, dateTo, department, exportFormat } = req.body;

    // Report Type Definitions
    // 1. HR_MASTER ("general"): Tổng hợp nhân sự (Profile)
    // 2. HR_MOVEMENT ("movement"): Biến động (History)
    // 3. HR_TAGS ("classifications"): Phân loại (Tags)

    // Count Records Logic
    let recordCount = 0;

    if (reportType === "movement") {
      const history = await readDB(HISTORY_PATH);
      // Filter History by Date
      const from = dateFrom ? new Date(dateFrom) : new Date(0);
      const to = dateTo ? new Date(dateTo) : new Date();
      to.setHours(23, 59, 59, 999);

      recordCount = history.filter((h) => {
        const t = new Date(h.timestamp);
        return t >= from && t <= to;
      }).length;
    } else {
      // Users based reports
      const usersDb = await readDB(USERS_PATH);
      let filteredUsers = usersDb.users || [];

      if (department) {
        filteredUsers = filteredUsers.filter(
          (u) => u.department === department
        );
      }
      // Date filter usually applies to Join Date for Master lists?
      // Or "Active as of"? Let's apply Join Date filter if provided.
      if (dateFrom || dateTo) {
        const from = dateFrom ? new Date(dateFrom) : new Date(0);
        const to = dateTo ? new Date(dateTo) : new Date();
        to.setHours(23, 59, 59, 999);
        filteredUsers = filteredUsers.filter((u) => {
          const dateStr = u.unionDate || u.createdAt;
          const d = dateStr ? new Date(dateStr) : null;
          return d && d >= from && d <= to;
        });
      }
      recordCount = filteredUsers.length;
    }

    // Create Report Metadata
    const reportNames = {
      general: "Danh sách trích ngang (Tổng hợp)",
      movement: "Báo cáo Biến động Nhân sự",
      classifications: "Báo cáo Phân loại & Quy hoạch",
    };

    const newReport = {
      id: Date.now().toString(),
      name: `${reportNames[reportType] || "Báo cáo"} ${
        department ? `- ${department}` : ""
      }`,
      type: reportType || "general",
      createdBy: req.userName || "Admin",
      createdAt: new Date().toISOString(),
      format: exportFormat || "csv",
      recordCount: recordCount,
      status: "Hoàn thành",
      criteria: { department, dateFrom, dateTo },
    };

    // Save to History
    const reportsDb = await readDB(REPORTS_PATH);
    reportsDb.reports = reportsDb.reports || [];
    reportsDb.reports.unshift(newReport);
    await writeDB(REPORTS_PATH, reportsDb);

    res.json({
      success: true,
      message: "Báo cáo đã được tạo thành công",
      data: newReport,
    });
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/reports - Get History
router.get("/", authMiddleware, async (req, res) => {
  try {
    const db = await readDB(REPORTS_PATH);
    res.json({ success: true, data: db.reports || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/reports/:id/download - Download file
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const reportId = req.params.id;
    const reportsDb = await readDB(REPORTS_PATH);
    const reportVal = reportsDb.reports.find((r) => r.id === reportId);

    if (!reportVal) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    const { type, criteria } = reportVal;
    let csvContent = "";

    // Load Data Sources
    const usersDb = await readDB(USERS_PATH);
    const users = usersDb.users || [];

    // --- GENERATE CONTENT BASED ON TYPE ---

    if (type === "movement") {
      // === BIẾN ĐỘNG (JOB HISTORY) ===
      const historyFull = await readDB(HISTORY_PATH);

      // Filter History
      const from = criteria.dateFrom
        ? new Date(criteria.dateFrom)
        : new Date(0);
      const to = criteria.dateTo ? new Date(criteria.dateTo) : new Date();
      to.setHours(23, 59, 59, 999);

      let filteredHistory = historyFull.filter((h) => {
        const t = new Date(h.timestamp);
        return t >= from && t <= to;
      });

      // Enrich with User Names
      let enriched = filteredHistory.map((h) => {
        const u = users.find((user) => String(user.id) === String(h.userId));
        return {
          ...h,
          userName: u ? u.name : "Unknown/Deleted",
          userCode: u ? u.employeeId : "N/A",
        };
      });

      // Refilter by Dept if needed
      if (criteria.department) {
        enriched = enriched.filter((h) => {
          const u = users.find((user) => String(user.id) === String(h.userId));
          return u && u.department === criteria.department;
        });
      }

      // CSV Structure: Time | Staff Code | Name | Type | Content | Old | New | Note
      const header =
        "Thoi Gian,Ma CB,Ho Ten,Loai Bien Dong,Noi Dung,Cu,Moi,Ghi Chu\n";
      const rows = enriched
        .map((h) => {
          const time = new Date(h.timestamp).toLocaleString("vi-VN");
          const typeName =
            h.type === "LUAN_CHUYEN"
              ? "Luân chuyển/Bổ nhiệm"
              : h.type === "THAY_DOI_TRANG_THAI"
              ? "Thay đổi trạng thái"
              : h.type;
          return `"${time}","${h.userCode}","${h.userName}","${typeName}","${h.fieldName}","${h.oldValue}","${h.newValue}","${h.note}"`;
        })
        .join("\n");
      csvContent = header + rows;
    } else if (type === "classifications") {
      // === PHÂN LOẠI / TAGS (TAGS REPORT) ===
      let filteredUsers = users;

      if (criteria.department) {
        filteredUsers = filteredUsers.filter(
          (u) => u.department === criteria.department
        );
      }
      // Date filter usually less relevant for Tags, but we respect it if set for "New tagged users"?
      // Let's assume Director wants ALL active staff classified.
      // If dates provided, maybe filter by join date.

      // CSV Structure: Code | Name | Dept | Position | TAGS | Status
      const header = "Ma CB,Ho Ten,Don Vi,Chuc Vu,Nhan/Phan Loai,Trang Thai\n";
      const rows = filteredUsers
        .map((u) => {
          const tags = (u.tags || []).join(", ");
          return `${u.employeeId},"${u.name}","${u.department}","${u.position}","${tags}","${u.status}"`;
        })
        .join("\n");
      csvContent = header + rows;
    } else {
      // === HR MASTER (GENERAL) ===
      let filteredUsers = users;

      if (criteria.department)
        filteredUsers = filteredUsers.filter(
          (u) => u.department === criteria.department
        );
      if (criteria.dateFrom || criteria.dateTo) {
        const from = criteria.dateFrom
          ? new Date(criteria.dateFrom)
          : new Date(0);
        const to = criteria.dateTo ? new Date(criteria.dateTo) : new Date();
        to.setHours(23, 59, 59, 999);
        filteredUsers = filteredUsers.filter((u) => {
          const dateStr = u.unionDate || u.createdAt;
          const d = dateStr ? new Date(dateStr) : null;
          return d && d >= from && d <= to;
        });
      }

      // CSV Structure: Detailed Profile
      const header =
        "Ma CB,Ho Ten,Email,SDT,Don Vi,Chuc Vu,Trang Thai,Ngay Gia Nhap,Ngay Sinh,Dia Chi,CCCD\n";
      const rows = filteredUsers
        .map((u) => {
          return `${u.employeeId},"${u.name}",${u.email},${u.phone},"${
            u.department
          }","${u.position}","${u.status}","${u.unionDate || ""}","${
            u.birthDate || ""
          }","${u.address || ""}","${u.idCard || ""}"`;
        })
        .join("\n");
      csvContent = header + rows;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="baocao-${type}-${reportId}.csv"`
    );
    res.send("\uFEFF" + csvContent);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- SCHEDULE ROUTE HANDLERS ---
const SCHEDULE_PATH = path.join(__dirname, "../data/scheduled_tasks.json");
const scheduler = require("../services/scheduler"); // Need to export scheduleTask from scheduler service

// GET /api/reports/schedule
router.get("/schedule/list", authMiddleware, async (req, res) => {
  try {
    const tasks = await readDB(SCHEDULE_PATH); // Reuse readDB helper if compatible (it checks ENOENT)
    // readDB returns object? No, readDB helper in this file returns object {users:[]} etc based on path check.
    // Need to update readDB helper or just use fs.
    // Let's use fs for simplicity here or update helper.
    // The helper checks specific paths. Let's update helper logic?
    // Easier to just read here
    let data = [];
    try {
      const raw = await fs.readFile(SCHEDULE_PATH, "utf8");
      data = JSON.parse(raw);
    } catch (e) {
      data = [];
    }

    res.json({ success: true, data });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Error loading schedules" });
  }
});

// POST /api/reports/schedule
router.post("/schedule/create", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      reportType,
      cronExpression,
      recipients,
      department,
      dataPeriod,
    } = req.body;

    let tasks = [];
    try {
      const raw = await fs.readFile(SCHEDULE_PATH, "utf8");
      tasks = JSON.parse(raw);
    } catch (e) {
      tasks = [];
    }

    const newTask = {
      id: Date.now().toString(),
      name,
      reportType,
      cronExpression, // "0 8 * * 1"
      dataPeriod: dataPeriod || "previous_day", // Default
      recipients: recipients, // Assuming string or array
      department,
      createdBy: req.userName,
      active: true,
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    await fs.writeFile(SCHEDULE_PATH, JSON.stringify(tasks, null, 2));

    // Activate immediately in memory
    // We need to require the scheduler service.
    // Note: Circular dependency risk? reports.js -> scheduler.js. scheduler.js -> reports.js?
    // scheduler.js does NOT require reports.js. It implements its own logic. Safe.
    // But we need to export scheduleTask from scheduler.js (I did not export it in previous step).
    // Wait, I only exported { initializeScheduler, loadTasks }.
    // usage: scheduler.initializeScheduler() re-reads everything? No, inefficient.
    // Better to export scheduleTask. I will fix scheduler.js next.

    // For now, let's just save. The restart will pick it up.
    // Or better: call a reload function.
    await scheduler.initializeScheduler();

    res.json({
      success: true,
      message: "Đã lên lịch thành công",
      data: newTask,
    });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ success: false, message: "Error creating schedule" });
  }
});

// PUT /api/reports/schedule/:id/toggle
router.put("/schedule/:id/toggle", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body; // true/false

    let tasks = [];
    try {
      const raw = await fs.readFile(SCHEDULE_PATH, "utf8");
      tasks = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ success: false, message: "Read Error" });
    }

    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    tasks[index].active = active;
    await fs.writeFile(SCHEDULE_PATH, JSON.stringify(tasks, null, 2));

    // Reload scheduler
    try {
      await scheduler.reloadTasks();
    } catch (e) {
      console.error("Scheduler reload failed:", e);
    }

    res.json({
      success: true,
      message: `Task ${active ? "activated" : "deactivated"}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/reports/schedule/:id (Update Full)
router.put("/schedule/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      reportType,
      cronExpression,
      recipients,
      department,
      dataPeriod,
    } = req.body;

    let tasks = [];
    try {
      const raw = await fs.readFile(SCHEDULE_PATH, "utf8");
      tasks = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ success: false, message: "Read Error" });
    }

    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    // Update fields
    tasks[index].name = name;
    tasks[index].reportType = reportType;
    tasks[index].cronExpression = cronExpression;
    tasks[index].recipients = recipients;
    tasks[index].department = department;
    tasks[index].dataPeriod = dataPeriod;

    await fs.writeFile(SCHEDULE_PATH, JSON.stringify(tasks, null, 2));

    // Reload scheduler
    try {
      await scheduler.reloadTasks();
    } catch (e) {}

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/reports/schedule/:id
router.delete("/schedule/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    let tasks = [];
    try {
      const raw = await fs.readFile(SCHEDULE_PATH, "utf8");
      tasks = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ success: false, message: "Read Error" });
    }

    const newTasks = tasks.filter((t) => t.id !== id);

    await fs.writeFile(SCHEDULE_PATH, JSON.stringify(newTasks, null, 2));

    // Reload scheduler
    try {
      await scheduler.reloadTasks();
    } catch (e) {}

    res.json({ success: true, message: "Đã xóa lịch trình" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
