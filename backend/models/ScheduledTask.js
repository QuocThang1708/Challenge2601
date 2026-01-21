const mongoose = require("mongoose");

const ScheduledTaskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  reportType: {
    type: String, // 'general', 'movement', 'classifications'
    required: true,
  },
  cronExpression: {
    type: String,
    required: true,
  },
  dataPeriod: {
    type: String, // 'current_week', 'previous_week', 'same_day'
    default: "current_week",
  },
  recipients: {
    type: [String],
    required: true,
  },
  department: {
    type: String,
    default: "",
  },
  createdBy: {
    type: String,
    default: "Admin",
  },
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastRun: {
    type: Date,
  },
  lastStatus: {
    type: String, // 'success', 'failed'
  },
});

module.exports = mongoose.model("ScheduledTask", ScheduledTaskSchema);
