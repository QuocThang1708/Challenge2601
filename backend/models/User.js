const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    status: {
      type: String,
      enum: [
        "Đang công tác",
        "Đã nghỉ việc",
        "Nghỉ việc",
        "Nghi phép",
        "Nghỉ phép",
        "Thai sản",
        "Đình chỉ",
        "Chuyển đơn vị",
        "Active",
        "Inactive",
      ],
      default: "Đang công tác",
    },
    department: {
      type: String,
      default: "",
    },
    position: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationCode: String,
    verificationCodeExpiry: Date,
    resetCode: String,
    resetCodeExpiry: Date,
    verificationToken: String, // Keep for backward compat if needed or just remove? keeping for safety
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    // Additional fields from users.json analysis if any
    employeeId: String,
    unionDate: String,
    birthDate: String,
    address: String,
    idCard: String,
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

module.exports = mongoose.model("User", UserSchema);
