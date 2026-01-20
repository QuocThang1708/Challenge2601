const cron = require("node-cron");
const fs = require("fs").promises;
const path = require("path");
const emailService = require("./emailService");

const TASKS_PATH = path.join(__dirname, "../data/scheduled_tasks.json");
const USERS_PATH = path.join(__dirname, "../data/users.json");
const HISTORY_PATH = path.join(__dirname, "../data/job_history.json");

// In-memory job storage to allow stopping/managing jobs
let programmedJobs = {};

async function loadTasks() {
  try {
    const data = await fs.readFile(TASKS_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function initializeScheduler() {
  console.log("⏰ Initializing Scheduler...");
  console.log(`   Server Time: ${new Date().toString()}`);
  console.log(`   Timezone Offset: ${new Date().getTimezoneOffset()}`);
  const tasks = await loadTasks();

  tasks.forEach((task) => {
    if (task.active) {
      scheduleTask(task);
    }
  });
  console.log(
    `⏰ Scheduler initialized with ${
      Object.keys(programmedJobs).length
    } active jobs.`,
  );
}

function scheduleTask(task) {
  // Validate Cron Expression
  if (!cron.validate(task.cronExpression)) {
    console.error(
      `❌ Invalid cron expression for task ${task.id}: ${task.cronExpression}`,
    );
    return;
  }

  // Stop existing if re-scheduling
  if (programmedJobs[task.id]) {
    programmedJobs[task.id].stop();
  }

  console.log(
    `📅 Scheduling task [${task.name}] with cron: ${task.cronExpression}`,
  );

  const job = cron.schedule(task.cronExpression, async () => {
    console.log(`🚀 Executing Scheduled Task: ${task.name} (${task.id})`);
    try {
      await executeReportGeneration(task);
    } catch (error) {
      console.error(`❌ Task execution failed for ${task.id}:`, error);
    }
  });

  programmedJobs[task.id] = job;
}

// Logic to generate report and send email
async function executeReportGeneration(task) {
  // Load users for validation
  let users = [];
  try {
    const usersData = await fs.readFile(USERS_PATH, "utf8");
    users = JSON.parse(usersData).users || [];
  } catch (err) {
    console.error("❌ Error loading users for validation:", err);
  }

  // 1. Calculate Date Range (Dynamic)
  const now = new Date();
  let dateFrom = new Date();
  let dateTo = new Date();

  // Logic based on Data Period (Preferred) or Cron (Fallback)
  const period = task.dataPeriod || "auto";

  if (period === "same_day") {
    // Today 00:00 to Now
    dateFrom.setHours(0, 0, 0, 0);
  } else if (period === "previous_day") {
    // Yesterday 00:00 to 23:59
    dateFrom.setDate(now.getDate() - 1);
    dateTo.setDate(now.getDate() - 1);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "last_7_days") {
    dateFrom.setDate(now.getDate() - 7);
  } else if (period === "last_30_days") {
    dateFrom.setDate(now.getDate() - 30);
  } else if (period === "previous_week") {
    // Last Monday to Last Sunday
    // Get current day (0=Sun, 1=Mon)
    const day = now.getDay();
    const diffToMon = (day + 6) % 7; // Days since last monday (if today Mon(1) -> 0)
    // Actually we want PREVIOUS week.
    // Example: Today is Wed 15th. This week Mon is 13th. Prev week Mon is 6th. Prev week Sun is 12th.
    // days to subtract to get to This Week Monday: diffToMon
    // days to subtract to get to Prev Week Monday: diffToMon + 7
    const lastMon = new Date(now);
    lastMon.setDate(now.getDate() - diffToMon - 7);

    const lastSun = new Date(lastMon);
    lastSun.setDate(lastMon.getDate() + 6);

    dateFrom = lastMon;
    dateTo = lastSun;
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "current_week") {
    // This Monday to Now
    const day = now.getDay();
    const diffToMon = (day + 6) % 7;
    dateFrom.setDate(now.getDate() - diffToMon);
    dateFrom.setHours(0, 0, 0, 0);
  } else if (period === "previous_month") {
    // 1st of prev month to Last of prev month
    dateFrom.setMonth(now.getMonth() - 1);
    dateFrom.setDate(1);

    dateTo.setDate(0); // 0th day of this month = Last day of prev month
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "current_month") {
    dateFrom.setDate(1);
    dateFrom.setHours(0, 0, 0, 0);
  } else if (period === "custom" && task.customRange) {
    // Custom Static Range
    dateFrom = new Date(task.customRange.from);
    dateTo = new Date(task.customRange.to);
    // Validate
    if (isNaN(dateFrom.getTime())) dateFrom = new Date();
    if (isNaN(dateTo.getTime())) dateTo = new Date();

    // Set End of Day for To
    dateTo.setHours(23, 59, 59, 999);
  } else {
    // Fallback manual cron logic
    if (task.cronExpression.endsWith(" 1")) {
      // Weekly cron
      dateFrom.setDate(now.getDate() - 7);
    } else if (task.cronExpression.includes(" 1 * *")) {
      // Monthly cron
      dateFrom.setMonth(now.getMonth() - 1);
      dateFrom.setDate(1);
      dateTo.setDate(0);
    } else {
      dateFrom.setDate(now.getDate() - 1); // Daily
    }
    // Ensure times set if fallback hit
    if (dateTo > now) dateTo = new Date(); // Cap at now? No, stick to logic
    dateFrom.setHours(0, 0, 0, 0);
  }

  // If not explicitly set above, verify times
  if (
    period !== "previous_day" &&
    period !== "previous_week" &&
    period !== "previous_month" &&
    period !== "custom"
  ) {
    // Open-ended 'To' usually means 'Now' or 'End of Today'.
    // For 'current' periods, To is Now.
    // For 'last_x_days', To is Now.
    dateTo = new Date();
  }

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
  console.log(
    `🕵️ Validating recipients... (Users loaded: ${
      users ? users.length : "undefined"
    })`,
  );

  const validRecipients = [];
  const invalidLog = [];

  if (Array.isArray(task.recipients)) {
    let list = task.recipients;
    if (typeof list === "string") list = list.split(",").map((s) => s.trim());

    if (!users || !Array.isArray(users)) {
      console.error(
        "❌ CRTICAL: users array is invalid during validation:",
        users,
      );
      // Fallback: don't crash, but can't validate roles. Maybe allow if forced?
      // Safe fail:
      console.warn("   Skipping validation due to missing user data.");
    } else {
      list.forEach((email) => {
        try {
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
            invalidLog.push(`${email} (Not found in system)`);
          }
        } catch (err) {
          console.error(`Error validating email ${email}:`, err);
          invalidLog.push(`${email} (Validation Error)`);
        }
      });
    }
  }

  if (validRecipients.length === 0) {
    console.warn(`⚠️ Task ${task.name}: No valid recipients found. Skipped.`);
    console.warn(`   Invalid details: ${invalidLog.join(", ")}`);
    return;
  }

  console.log(`📧 Sending report to ${validRecipients.length} valid admins.`);
  if (invalidLog.length > 0)
    console.log(`   Skipped: ${invalidLog.join(", ")}`);

  const dateRangeStr = `${dateFrom.toLocaleDateString(
    "vi-VN",
  )} - ${dateTo.toLocaleDateString("vi-VN")}`;

  try {
    await emailService.sendReportEmail(
      validRecipients,
      task.name,
      dateRangeStr,
      [
        {
          filename: fileName,
          content: "\uFEFF" + csvContent,
        },
      ],
    );
  } catch (e) {
    console.error(`❌ FATAL: Could not send email for task ${task.id}`, e);
  }
}

// Replicated Logic from reports.js
async function generateCSV(type, from, to, departmentFilter) {
  const usersRaw = await fs.readFile(USERS_PATH, "utf8");
  const users = JSON.parse(usersRaw).users || [];

  // Helper helpers
  const readHistory = async () => {
    try {
      return JSON.parse(await fs.readFile(HISTORY_PATH, "utf8"));
    } catch {
      return [];
    }
  };

  let csvContent = "";

  if (type === "movement") {
    const history = await readHistory();
    let filtered = history.filter((h) => {
      const t = new Date(h.timestamp);
      return t >= from && t <= to;
    });

    // Enrich
    const enriched = filtered.map((h) => {
      const u = users.find((user) => String(user.id) === String(h.userId));
      return {
        ...h,
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

      // CRITICAL FIX: Filter by Date (createdAt)
      // For General reports, we typically report on NEW users in the period?
      // Or users active?
      // "Báo cáo nhân sự mới" implies New.
      // If the report type is just "general" (Tổng hợp), it might mean "Census".
      // BUT if a narrow date period is set (like Yesterday), Census makes no sense (it's same every day).
      // So assuming "Changes/New" if period is small?
      // Let's filter by createdAt for now as per user request (Recent changes).

      const joined = new Date(u.createdAt || u.unionDate || 0); // Fallback
      return joined >= from && joined <= to;
    });

    if (type === "classifications") {
      const header = "Ma CB,Ho Ten,Don Vi,Chuc Vu,Nhan/Phan Loai,Trang Thai\n";
      const rows = filteredUsers
        .map((u) => {
          return `${u.employeeId},"${u.name}","${u.department}","${
            u.position
          }","${(u.tags || []).join(", ")}","${u.status}"`;
        })
        .join("\n");
      csvContent = header + rows;
    } else {
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
  }
  return csvContent;
}

async function reloadTasks() {
  console.log("🔄 Reloading tasks...");
  // clear all existing
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
  scheduleTask, // Export if needed else where
};
