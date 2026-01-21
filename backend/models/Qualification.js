const mongoose = require("mongoose");

const QualificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  education: {
    type: [mongoose.Schema.Types.Mixed], // Flexible array of objects
    default: [],
  },
  experience: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  skills: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  achievements: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Qualification", QualificationSchema);
