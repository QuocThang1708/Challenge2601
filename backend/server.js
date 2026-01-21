const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://hrm-ai-user-portal.onrender.com",
      "https://hrm-ai-admin-portal.onrender.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/cv", require("./routes/cv")); // Fixed from cvs
app.use("/api/qualifications", require("./routes/qualifications"));
app.use("/api/reports", require("./routes/reports")); // Restored reports
app.use("/api/departments", require("./routes/departments"));
app.use("/api/roles", require("./routes/roles")); // Register roles route
app.use("/api/statistics", require("./routes/statistics"));
app.use("/api/audit-logs", require("./routes/auditLogs")); // Audit Logs

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "HRM API Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

const PORT = process.env.PORT || 5000;

const connectDB = require("./config/db");
const scheduler = require("./services/scheduler");

app.listen(PORT, async () => {
  console.log(`🚀 HRM API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV}`);

  // Connect Database
  await connectDB();

  // Initialize Scheduled Tasks
  await scheduler.initializeScheduler();
});

module.exports = app;
