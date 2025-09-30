const express = require("express");
const { submitAbstract, getAbstracts, updateAbstractStatus } = require("../controllers/abstractController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Public submission
router.post("/", submitAbstract);

// Admin routes
router.get("/", protect, authorize("admin"), getAbstracts);
router.put("/:id/status", protect, authorize("admin"), updateAbstractStatus);

module.exports = router;
