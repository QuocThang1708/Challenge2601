const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { auth } = require("../middlewares/auth"); // Use centralized auth
const scheduler = require("../services/scheduler");

// Import Models
const Report = require("../models/Report");
const ScheduledTask = require("../models/ScheduledTask");
const User = require("../models/User");
const JobHistory = require("../models/JobHistory");

// POST /api/reports/generate - Generate & Save Report (To History)
router.post("/generate", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { reportType, dateFrom, dateTo, department, exportFormat } = req.body;

    // Count Records Logic
    let recordCount = 0;
    const from = dateFrom ? new Date(dateFrom) : new Date(0);
    const to = dateTo ? new Date(dateTo) : new Date();
    to.setHours(23, 59, 59, 999);

    if (reportType === "movement") {
      recordCount = await JobHistory.countDocuments({
        timestamp: { $gte: from, $lte: to },
      });
    } else {
      // Users based reports
      const query = {};
      if (department) query.department = department;

      // Date filter for users (Join date or Created date)
      if (dateFrom || dateTo) {
        query.$or = [
          { unionDate: { $gte: dateFrom, $lte: dateTo } }, // String comparison might be iffy if format varies
          { createdAt: { $gte: from, $lte: to } },
        ];
        // Note: unionDate is String (YYYY-MM-DD). createdAt is Date.
        // Simple string comparison for unionDate works if YYYY-MM-DD.
        // But safer to rely on createdAt for "Recent" reports.
        // Let's stick to createdAt filter for now or build complex query.
        delete query.$or;
        query.createdAt = { $gte: from, $lte: to };
      }
      recordCount = await User.countDocuments(query);
    }

    const reportNames = {
      general: "Danh sách trích ngang (Tổng hợp)",
      movement: "Báo cáo Biến động Nhân sự",
      classifications: "Báo cáo Phân loại & Quy hoạch",
    };

    const newReport = new Report({
      name: `${reportNames[reportType] || "Báo cáo"} ${department ? `- ${department}` : ""}`,
      type: reportType || "general",
      createdBy: req.user.name || "Admin",
      format: exportFormat || "csv",
      recordCount: recordCount,
      status: "Hoàn thành",
      criteria: { department, dateFrom, dateTo },
      createdAt: new Date(),
    });

    await newReport.save();

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
router.get("/", auth, async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/reports/:id/download - Download file
router.get("/:id/download", auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report)
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });

    const { type, criteria } = report;
    let csvContent = "";

    // Load Data Sources
    const users = await User.find({});

    // --- GENERATE CONTENT BASED ON TYPE ---
    // (Logic duplicated from scheduler logic for now - clean overlap later)

    const from = criteria.dateFrom ? new Date(criteria.dateFrom) : new Date(0);
    const to = criteria.dateTo ? new Date(criteria.dateTo) : new Date();
    to.setHours(23, 59, 59, 999);

    if (type === "movement") {
      const historyFull = await JobHistory.find({
        timestamp: { $gte: from, $lte: to },
      });

      let enriched = historyFull.map((h) => {
        const u = users.find((user) => String(user._id) === String(h.userId));
        return {
          ...h.toObject(),
          userName: u ? u.name : "Unknown/Deleted",
          userCode: u ? u.employeeId : "N/A",
        };
      });

      if (criteria.department) {
        enriched = enriched.filter((h) => {
          const u = users.find((user) => String(user._id) === String(h.userId));
          return u && u.department === criteria.department;
        });
      }

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
      let filteredUsers = users;
      if (criteria.department)
        filteredUsers = filteredUsers.filter(
          (u) => u.department === criteria.department,
        );

      const header = "Ma CB,Ho Ten,Don Vi,Chuc Vu,Nhan/Phan Loai,Trang Thai\n";
      const rows = filteredUsers
        .map((u) => {
          return `${u.employeeId},"${u.name}","${u.department}","${u.position}","${(u.tags || []).join(", ")}","${u.status}"`;
        })
        .join("\n");
      csvContent = header + rows;
    } else {
      // HR MASTER
      let filteredUsers = users;
      if (criteria.department)
        filteredUsers = filteredUsers.filter(
          (u) => u.department === criteria.department,
        );

      if (criteria.dateFrom || criteria.dateTo) {
        filteredUsers = filteredUsers.filter((u) => {
          const d = new Date(u.createdAt);
          return d >= from && d <= to;
        });
      }

      const header =
        "Ma CB,Ho Ten,Email,SDT,Don Vi,Chuc Vu,Trang Thai,Ngay Gia Nhap,Ngay Sinh,Dia Chi,CCCD\n";
      const rows = filteredUsers
        .map((u) => {
          return `${u.employeeId},"${u.name}",${u.email},${u.phone},"${u.department}","${u.position}","${u.status}","${u.unionDate || ""}","${u.birthDate || ""}","${u.address || ""}","${u.idCard || ""}"`;
        })
        .join("\n");
      csvContent = header + rows;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="baocao-${type}-${report._id}.csv"`,
    );
    res.send("\uFEFF" + csvContent);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- SCHEDULE ROUTE HANDLERS ---

// GET /api/reports/schedule/list
router.get("/schedule/list", auth, async (req, res) => {
  try {
    const tasks = await ScheduledTask.find({});
    res.json({ success: true, data: tasks });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Error loading schedules" });
  }
});

// POST /api/reports/schedule/create
router.post("/schedule/create", auth, async (req, res) => {
  try {
    const {
      name,
      reportType,
      cronExpression,
      recipients,
      department,
      dataPeriod,
    } = req.body;

    const newTask = new ScheduledTask({
      name,
      reportType,
      cronExpression,
      dataPeriod: dataPeriod || "previous_day",
      recipients,
      department,
      createdBy: req.user.name,
      active: true,
    });

    await newTask.save();

    await scheduler.scheduleTask(newTask); // Schedule immediately

    res.json({
      success: true,
      message: "Đã lên lịch thành công",
      data: newTask,
    });
  } catch (e) {
    console.error("Create schedule error", e);
    res
      .status(500)
      .json({ success: false, message: "Error creating schedule" });
  }
});

// PUT /api/reports/schedule/:id/toggle
router.put("/schedule/:id/toggle", auth, async (req, res) => {
  try {
    const { active } = req.body;
    const task = await ScheduledTask.findByIdAndUpdate(
      req.params.id,
      { active },
      { new: true },
    );

    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    // Reload scheduler logic for this task
    // Or simpler: Full reload.
    // Optimization: Just update specific task
    // If active: schedule. If inactive: stop (handled in reloadTasks logic usually, or explicitly stop)
    // scheduler.js `scheduleTask` handles stopping existing job if re-scheduling.
    // But if we toggle to INACTIVE, `scheduleTask` in my rewrite checks `if (!task.active) return`.
    // So if we call `scheduleTask` with inactive task, it returns (and doesn't stop explicitly if logic doesn't say so).
    // My rewrite:
    // if (programmedJobs[task._id]) programmedJobs[task._id].stop();
    // if (!task.active) return;
    // So calling scheduleTask WILL stop the job correctly!

    scheduler.scheduleTask(task);

    res.json({
      success: true,
      message: `Task ${active ? "activated" : "deactivated"}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/reports/schedule/:id (Update Full)
router.put("/schedule/:id", auth, async (req, res) => {
  try {
    const {
      name,
      reportType,
      cronExpression,
      recipients,
      department,
      dataPeriod,
    } = req.body;

    const task = await ScheduledTask.findByIdAndUpdate(
      req.params.id,
      {
        name,
        reportType,
        cronExpression,
        recipients,
        department,
        dataPeriod,
      },
      { new: true },
    );

    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    scheduler.scheduleTask(task);

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/reports/schedule/:id
router.delete("/schedule/:id", auth, async (req, res) => {
  try {
    const task = await ScheduledTask.findByIdAndDelete(req.params.id);
    if (task) {
      // Stop the job instance if it exists - reusing logic?
      // scheduleTask logic handles stop if exists in map.
      // But passing null/deleted task?
      // We need to validly stop it.
      // Let's call scheduler.reloadTasks() to be safe and clean.
      await scheduler.reloadTasks();
    }
    res.json({ success: true, message: "Đã xóa lịch trình" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
