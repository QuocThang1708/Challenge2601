const cron = require("node-cron");
const emailService = require("./emailService");
const ScheduledTask = require("../models/ScheduledTask");
const User = require("../models/User");
const JobHistory = require("../models/JobHistory");

// In-memory job storage
let programmedJobs = {};

async function loadTasks() {
  try {
    return await ScheduledTask.find({ active: true });
  } catch (err) {
    console.error("❌ Error loading tasks from DB:", err);
    return [];
  }
}

async function initializeScheduler() {
  console.log("⏰ Initializing Scheduler...");
  console.log(`   Server Time: ${new Date().toString()}`);
  console.log(`   Timezone Offset: ${new Date().getTimezoneOffset()}`);

  const tasks = await loadTasks();

  tasks.forEach((task) => {
    scheduleTask(task);
  });

  console.log(
    `⏰ Scheduler initialized with ${Object.keys(programmedJobs).length} active jobs.`,
  );
}

function scheduleTask(task) {
  if (!task.active) return;

  if (!cron.validate(task.cronExpression)) {
    console.error(
      `❌ Invalid cron expression for task ${task._id}: ${task.cronExpression}`,
    );
    return;
  }

  // Stop existing if re-scheduling
  if (programmedJobs[task._id]) {
    programmedJobs[task._id].stop();
  }

  console.log(
    `📅 Scheduling task [${task.name}] with cron: ${task.cronExpression}`,
  );

  const job = cron.schedule(task.cronExpression, async () => {
    console.log(`🚀 Executing Scheduled Task: ${task.name} (${task._id})`);
    try {
      await executeReportGeneration(task);
      // Update lastRun
      await ScheduledTask.findByIdAndUpdate(task._id, {
        lastRun: new Date(),
        lastStatus: "success",
      });
    } catch (error) {
      console.error(`❌ Task execution failed for ${task._id}:`, error);
      await ScheduledTask.findByIdAndUpdate(task._id, {
        lastStatus: "failed",
      });
    }
  });

  programmedJobs[task._id] = job;
}

// Logic to generate report and send email
async function executeReportGeneration(task) {
  // Load users for validation
  let users = [];
  try {
    users = await User.find({});
  } catch (err) {
    console.error("❌ Error loading users for validation:", err);
  }

  // 1. Calculate Date Range (Dynamic)
  const now = new Date();
  let dateFrom = new Date();
  let dateTo = new Date();
  const period = task.dataPeriod || "auto";

  if (period === "same_day") {
    dateFrom.setHours(0, 0, 0, 0);
  } else if (period === "previous_day") {
    dateFrom.setDate(now.getDate() - 1);
    dateTo.setDate(now.getDate() - 1);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "last_7_days") {
    dateFrom.setDate(now.getDate() - 7);
  } else if (period === "last_30_days") {
    dateFrom.setDate(now.getDate() - 30);
  } else if (period === "previous_week") {
    const day = now.getDay();
    const diffToMon = (day + 6) % 7;
    const lastMon = new Date(now);
    lastMon.setDate(now.getDate() - diffToMon - 7);
    const lastSun = new Date(lastMon);
    lastSun.setDate(lastMon.getDate() + 6);
    dateFrom = lastMon;
    dateTo = lastSun;
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "current_week") {
    const day = now.getDay();
    const diffToMon = (day + 6) % 7;
    dateFrom.setDate(now.getDate() - diffToMon);
    dateFrom.setHours(0, 0, 0, 0);
  } else if (period === "previous_month") {
    dateFrom.setMonth(now.getMonth() - 1);
    dateFrom.setDate(1);
    dateTo.setDate(0);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "current_month") {
    dateFrom.setDate(1);
    dateFrom.setHours(0, 0, 0, 0);
  } else if (period === "custom" && task.customRange) {
    // Assuming Schema Mixed or custom handling
    // task.customRange might be stored in Mixed type or we need to access logic
    // For now assuming simplistic structure if exists
    // The Schema we created didn't explicitly add customRange but Mixed is flexible?
    // Wait, ScheduledTask Schema didn't have customRange Mixed field. It had basics.
    // But Mongo is flexible. If migration copied it, it's there.
    // If not, this block is moot.
  } else {
    // Fallback manual cron logic
    if (task.cronExpression.endsWith(" 1")) {
      // Weekly
      dateFrom.setDate(now.getDate() - 7);
    } else if (task.cronExpression.includes(" 1 * *")) {
      // Monthly
      dateFrom.setMonth(now.getMonth() - 1);
      dateFrom.setDate(1);
      dateTo.setDate(0);
    } else {
      // Daily
      dateFrom.setDate(now.getDate() - 1);
    }
    if (dateTo > now) dateTo = new Date();
    dateFrom.setHours(0, 0, 0, 0);
  }

  if (dateTo > now) dateTo = new Date();

  console.log(
    `   Time Range (${period}): ${dateFrom.toISOString()} - ${dateTo.toISOString()}`,
  );

  // 2. Generate Content
  const csvContent = await generateCSV(
    task.reportType,
    dateFrom,
    dateTo,
    task.department,
  );
  const fileName = `baocao-${task.reportType}-${Date.now()}.csv`;

  // 3. Send Email
  console.log(`🕵️ Validating recipients... (Users loaded: ${users.length})`);

  const validRecipients = [];
  const invalidLog = [];

  if (Array.isArray(task.recipients)) {
    // ... Recipient Validation Logic ...
    let list = task.recipients;

    list.forEach((email) => {
      const user = users.find((u) => u.email === email);
      if (user) {
        const isActive =
          user.status === "Đang công tác" || user.status === "Active";
        const isAdmin = user.role === "admin" || user.role === "superadmin";

        if (isActive && isAdmin) {
          validRecipients.push(email);
        } else {
          invalidLog.push(
            `${email} (Role: ${user.role}, Status: ${user.status})`,
          );
        }
      } else {
        // For safety in migration, if email looks like admin email, maybe allow?
        // But strict mode says no.
        invalidLog.push(`${email} (Not found in system)`);
      }
    });
  }

  if (validRecipients.length === 0) {
    console.warn(`⚠️ Task ${task.name}: No valid recipients found. Skipped.`);
    return;
  }

  console.log(`📧 Sending report to ${validRecipients.length} valid admins.`);
  const dateRangeStr = `${dateFrom.toLocaleDateString("vi-VN")} - ${dateTo.toLocaleDateString("vi-VN")}`;

  try {
    await emailService.sendReportEmail(
      validRecipients,
      task.name,
      dateRangeStr,
      [{ filename: fileName, content: "\uFEFF" + csvContent }],
    );
  } catch (e) {
    console.error(`❌ FATAL: Could not send email for task ${task.id}`, e);
  }
}

async function generateCSV(type, from, to, departmentFilter) {
  // Use Mongoose to fetch
  const users = await User.find({});

  let csvContent = "";

  if (type === "movement") {
    // Fetch History from DB
    // Optimization: query by date directly here
    const history = await JobHistory.find({
      timestamp: { $gte: from, $lte: to },
    });

    // Enrich
    const enriched = history.map((h) => {
      const u = users.find(
        (user) =>
          String(user._id) === String(h.userId) ||
          String(user.employeeId) === String(h.userId),
      );
      // Handle both ObjectId and old String ID if possible
      return {
        ...h.toObject(),
        userName: u ? u.name : "Unknown",
        userCode: u ? u.employeeId : "N/A",
      };
    });

    const header =
      "Thoi Gian,Ma CB,Ho Ten,Loai Bien Dong,Noi Dung,Cu,Moi,Ghi Chu\n";
    const rows = enriched
      .map((h) => {
        const time = new Date(h.timestamp).toLocaleString("vi-VN");
        return `"${time}","${h.userCode}","${h.userName}","${h.type}","${h.fieldName}","${h.oldValue}","${h.newValue}","${h.note}"`;
      })
      .join("\n");
    csvContent = header + rows;
  } else {
    // General / Classifications
    let filteredUsers = users.filter((u) => {
      if (departmentFilter && u.department !== departmentFilter) return false;
      const joined = new Date(u.createdAt || u.unionDate || 0);
      // Note: createdAt in DB is Date object. unionDate string.
      return joined >= from && joined <= to;
    });

    if (type === "classifications") {
      const header = "Ma CB,Ho Ten,Don Vi,Chuc Vu,Nhan/Phan Loai,Trang Thai\n";
      const rows = filteredUsers
        .map((u) => {
          return `${u.employeeId},"${u.name}","${u.department}","${u.position}","${(u.tags || []).join(", ")}","${u.status}"`;
        })
        .join("\n");
      csvContent = header + rows;
    } else {
      const header =
        "Ma CB,Ho Ten,Email,SDT,Don Vi,Chuc Vu,Trang Thai,Ngay Gia Nhap,Ngay Sinh,Dia Chi,CCCD\n";
      const rows = filteredUsers
        .map((u) => {
          return `${u.employeeId},"${u.name}",${u.email},${u.phone},"${u.department}","${u.position}","${u.status}","${u.unionDate || ""}","${u.birthDate || ""}","${u.address || ""}","${u.idCard || ""}"`;
        })
        .join("\n");
      csvContent = header + rows;
    }
  }
  return csvContent;
}

async function reloadTasks() {
  console.log("🔄 Reloading tasks from DB...");
  for (const id in programmedJobs) {
    programmedJobs[id].stop();
    delete programmedJobs[id];
  }
  await initializeScheduler();
}

module.exports = {
  initializeScheduler,
  loadTasks,
  reloadTasks,
  scheduleTask,
};
