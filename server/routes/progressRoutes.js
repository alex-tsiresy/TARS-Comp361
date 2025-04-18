const express = require("express");
const router = express.Router();
const progressController = require("../controllers/progressController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Route to save progress for a specific user
router.post("/", authenticateToken, progressController.saveProgress);

// Route to fetch progress for a specific user
router.get("/", authenticateToken, progressController.getProgress);

// New route to delete all progress for a specific user
router.delete("/user/:userId", authenticateToken, progressController.deleteProgress);

module.exports = router;