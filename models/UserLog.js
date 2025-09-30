// models/UserLog.js
const mongoose = require("mongoose");

const userLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // if invalid, user may not exist
  },
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // admin/scanner user
    required: true,
  },
  qrData: {
    type: String,
    required: true, // the raw scanned QR content
  },
  isValid: {
    type: Boolean,
    required: true,
  },
  details: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("UserLog", userLogSchema);
