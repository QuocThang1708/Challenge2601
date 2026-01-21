const mongoose = require("mongoose");

const JobHistorySchema = new mongoose.Schema({
  userId: {
    type: String, // Storing as String to match old ID format if needed, or ObjectId if we link
    required: true,
  },
  type: {
    type: String, // 'LUAN_CHUYEN', 'THAY_DOI_TRANG_THAI', etc.
    required: true,
  },
  fieldName: {
    type: String, // 'Chức vụ', 'Phòng ban', 'Trạng thái'
  },
  oldValue: {
    type: String,
  },
  newValue: {
    type: String,
  },
  note: {
    type: String,
  },
  updaterId: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("JobHistory", JobHistorySchema);
