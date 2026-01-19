const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");

const LOG_FILE = path.join(__dirname, "../data/audit_logs.json");
const USERS_FILE = path.join(__dirname, "../data/users.json");

// GET /api/audit-logs
// Returns audit logs from admin site (only admin and dept_admin roles)
router.get("/", async (req, res) => {
  try {
    const data = await fs.readFile(LOG_FILE, "utf8");
    const logs = JSON.parse(data);

    // Read users to filter by admin roles (admin and dept_admin)
    let usersData;
    try {
      const usersFile = await fs.readFile(USERS_FILE, "utf8");
      usersData = JSON.parse(usersFile);
    } catch (e) {
      usersData = { users: [] };
    }

    // Create set of admin user IDs (only admin and dept_admin can access admin site)
    const adminUserIds = new Set(
      usersData.users
        .filter((u) => u.role === "admin" || u.role === "dept_admin")
        .map((u) => u.id)
    );

    // Filter logs: Only show activities from admin/dept_admin users
    // Filter logs: Only show activities from Admin Portal
    // We also include SYSTEM logs if initiated by admins (optional, but keep it simple first)
    // AND keep the role check as extra security
    const adminLogs = logs.filter((log) => {
      const isAdminUser = adminUserIds.has(log.actorId);
      // If the log has a 'source' field, use it.
      // If it's old data (no source), rely on isAdminUser.
      // If source is explicitly USER_PORTAL, exclude it even if admin.
      if (log.source) {
        return log.source === "ADMIN_PORTAL";
      }
      return isAdminUser;
    });

    res.json(adminLogs);
  } catch (error) {
    console.error("Error reading audit logs:", error);
    // Return empty array if file error
    res.json([]);
  }
});

module.exports = router;
