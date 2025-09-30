const express = require("express");
const {
  scanQRCode,
  getAllLogs,
  getUserLogs,
} = require("../controllers/scanController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Protect all routes
router.use(protect);

// Scan QR
router.post("/", authorize("admin", "user"), scanQRCode);

// Admin only → get all logs
router.get("/logs", authorize("admin"), getAllLogs);

// Admin or user themself → get logs by userId
router.get("/logs/:userId", authorize("admin", "user"), getUserLogs);

module.exports = router;
