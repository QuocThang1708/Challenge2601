const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  format: {
    type: String,
    default: "csv",
  },
  recordCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    default: "Hoàn thành",
  },
  criteria: {
    type: mongoose.Schema.Types.Mixed, // Stores filters like { department, dateFrom, dateTo }
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Report", ReportSchema);
