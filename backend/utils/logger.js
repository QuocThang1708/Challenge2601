const fs = require("fs").promises;
const path = require("path");

const LOG_FILE = path.join(__dirname, "../data/audit_logs.json");

/**
 * Log a system action
 * @param {Object} params - The log parameters
 * @param {string} params.actorId - ID of the user performing action (or 'system')
 * @param {string} params.actorName - Name of the user
 * @param {string} params.actionType - Type of action (LOGIN, CREATE_USER, etc.)
 * @param {string} params.target - Description of target (e.g. "User Tuan")
 * @param {string} params.status - SUCCESS or FAILURE
 * @param {string} params.ip - IP Address (optional)
 * @param {string} params.source - Source of action (ADMIN_PORTAL, USER_PORTAL, SYSTEM)
 * @param {string} params.details - Extra details (optional)
 */
async function logAction({
  actorId,
  actorName,
  actionType,
  target,
  status = "SUCCESS",
  ip = "",
  source = "SYSTEM",
  details = "",
}) {
  try {
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      actorId,
      actorName,
      actionType,
      target,
      status,
      ip,
      source,
      details,
    };

    // Read existing
    let logs = [];
    try {
      const data = await fs.readFile(LOG_FILE, "utf8");
      logs = JSON.parse(data);
    } catch (err) {
      // File might not exist or be empty, start fresh
      logs = [];
    }

    // Prepend new log (newest first)
    logs.unshift(logEntry);

    // Keep size manageable (e.g. last 1000 logs)
    if (logs.length > 2000) {
      logs = logs.slice(0, 2000);
    }

    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Don't throw, we don't want to break the app flow if logging fails
  }
}

module.exports = { logAction };
