const express = require("express");
const router = express.Router();
const progressController = require("../controllers/progressController");

// Route to save progress for a specific user
router.post("/", progressController.saveProgress);

// Route to fetch progress for a specific user
router.get("/", progressController.getProgress);

module.exports = router;