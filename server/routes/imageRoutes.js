const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");

// Route to fetch all images (rendering all at once) 
router.get("/", imageController.getAllImages);

// Route to fetch only one image (rendering based on position)
router.get("/:id", imageController.getImageById);

module.exports = router;