const mongoose = require("mongoose");

const abstractSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide your name"],
    trim: true,
  },
  registerNo: {
    type: String,
    required: [true, "Please provide your registration number"],
    trim: true,
  },
  institute: {
    type: String,
    required: [true, "Please provide institute name"],
    trim: true,
  },
  contact: {
    type: String,
    required: [true, "Please provide contact number"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please provide email"],
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please add a valid email"],
  },
  file: {
    type: String, // store uploaded file path
    required: true,
  },
  status: {
    type: String,
    enum: ["submitted", "under review", "accepted", "rejected"],
    default: "submitted",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Abstract", abstractSchema);
