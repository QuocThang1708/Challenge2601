const mongoose = require("mongoose");

const CVSchema = new mongoose.Schema({
  userId: {
    type: String, // Or ObjectId if strict, but matching existing logic
    required: true,
  },
  filename: String,
  storedFilename: String,
  size: Number,
  mimetype: String,
  path: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CV", CVSchema);
