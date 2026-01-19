const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");

// Paths
const USERS_PATH = path.join(__dirname, "../data/users.json");
const CVS_PATH = path.join(__dirname, "../data/cvs.json");

// Helper to safe parse JSON
async function readJson(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { users: [], cvs: [] }; // Return empty structure on fail
  }
}

// Simple statistics endpoint
router.get("/", async (req, res) => {
  try {
    const [usersData, cvsData] = await Promise.all([
      readJson(USERS_PATH),
      readJson(CVS_PATH),
    ]);

    const users = usersData.users || [];
    const cvs = cvsData.cvs || [];

    const stats = {
      totalEmployees: users.length,
      activeEmployees: users.filter((u) => u.status === "Đang công tác").length,
      inactiveEmployees: users.filter((u) => u.status !== "Đang công tác")
        .length,
      departments: {},
      byGender: {
        Nam: 0,
        Nữ: 0,
        Khác: 0,
      },
      byStatus: {},
      recentActivities: [],
    };

    // 1. Process Users (Stats + Activities)
    users.forEach((user) => {
      // Stats
      if (user.department) {
        stats.departments[user.department] =
          (stats.departments[user.department] || 0) + 1;
      }
      if (user.gender) {
        stats.byGender[user.gender] = (stats.byGender[user.gender] || 0) + 1;
      }
      if (user.status) {
        stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
      }

      // Activity: User Created
      if (user.createdAt) {
        stats.recentActivities.push({
          type: "new_user",
          user: user.name,
          time: user.createdAt,
          description: "đã tham gia hệ thống",
        });
      }
    });

    // 2. Process CVs (Activities)
    cvs.forEach((cv) => {
      if (cv.uploadDate) {
        const user = users.find((u) => u.id === cv.userId);
        stats.recentActivities.push({
          type: "cv_upload",
          user: user ? user.name : "Người dùng ẩn",
          time: cv.uploadDate,
          description: "đã tải lên CV mới",
        });
      }
    });

    // 3. Sort Activities and take top 10
    stats.recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));
    stats.recentActivities = stats.recentActivities.slice(0, 10);

    // 4. Calculate "Activity Today" count
    const today = new Date().toISOString().split("T")[0];
    stats.activityToday = stats.recentActivities.filter((a) =>
      a.time.startsWith(today)
    ).length;

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
