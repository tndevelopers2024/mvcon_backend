const express = require("express");
const { submitAbstract, getAbstracts, updateAbstractStatus, deleteAbstract, downloadAllAbstracts } = require("../controllers/abstractController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Public submission
router.post("/", submitAbstract);

// Admin routes
router.get("/", protect, authorize("admin"), getAbstracts);
router.get("/download-all", protect, authorize("admin"), downloadAllAbstracts);
router.put("/:id/status", protect, authorize("admin"), updateAbstractStatus);
router.delete("/:id", protect, authorize("admin"), deleteAbstract);

module.exports = router;
