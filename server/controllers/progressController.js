const Progress = require("../models/UserProgress");

const saveProgress = async (req, res) => {
  try {
    // Get user ID from the authenticated request
    const userId = req.user.id;

    // Check if we're receiving an array of progress objects
    if (Array.isArray(req.body.progress)) {
      const progressArray = req.body.progress;

      // Optionally delete all previous progress first
      await Progress.deleteMany({ user: userId });

      // Loop over each progress object, add the user field, and save it
      const savedProgresses = [];
      for (const progressItem of progressArray) {
        // Validate that required fields exist
        if (!progressItem.robotId || !progressItem.position || 
            progressItem.position.x === undefined || progressItem.position.z === undefined) {
          return res.status(400).json({ message: "One or more progress objects are missing required fields." });
        }
        // Attach the user ID
        progressItem.user = userId;
        progressItem.updatedAt = new Date();
        const savedItem = await Progress.create(progressItem);
        savedProgresses.push(savedItem);
      }

      return res.status(200).json({ message: "Progress saved successfully.", progress: savedProgresses });
    } else {
      // Fallback to the object-based approach (if needed)
      const progressData = {
        user: userId,
        robotId: req.body.robotId,
        position: req.body.position,
        height: req.body.height,
        coordinates: req.body.coordinates,
        behaviorGoal: req.body.behaviorGoal,
        speed: req.body.speed,
        capabilities: req.body.capabilities,
        updatedAt: new Date(),
      };

      // Delete all existing progress for this user
      await Progress.deleteMany({ user: userId });
      
      // Create and save the new progress
      const progress = new Progress(progressData);
      await progress.save();

      return res.status(200).json({ message: "Progress saved successfully.", progress });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while saving progress." });
  }
};

const getProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { robotId } = req.query;
    const query = { user: userId };
    if (robotId) {
      query.robotId = robotId;
    }
    const progress = await Progress.find(query);
    if (!progress || progress.length === 0) {
      return res.status(404).json({ message: "No progress found." });
    }
    res.status(200).json(progress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while retrieving progress." });
  }
};

const deleteProgress = async (req, res) => {
  try {
    const userId = req.params.userId;
    await Progress.deleteMany({ user: userId });
    res.status(200).json({ message: "Progress deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while deleting progress." });
  }
};

module.exports = { saveProgress, getProgress, deleteProgress };