const Progress = require("../models/Progress");

// Save (or update) a user's progress
const saveProgress = async (req, res) => {
  try {
    
    const progressData = {
      user: req.body.user,
      robotId: req.body.robotId,
      position: req.body.position,
      height: req.body.height,
      coordinates: req.body.coordinates,
      behaviorGoal: req.body.behaviorGoal,
      speed: req.body.speed,
      capabilities: req.body.capabilities,
      updatedAt: new Date(),
    };

    let progress = await Progress.findOne({ user: req.body.user, robotId: req.body.robotId });
    if (progress) {   // Update existing progress otherwise create a new one
      progress = await Progress.findOneAndUpdate(
        { user: req.body.user, robotId: req.body.robotId },
        progressData,
        { new: true }
      );
    } else {
      progress = new Progress(progressData);
      await progress.save();
    }
    res.status(200).json({ message: "Progress saved successfully.", progress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while saving progress." });
  }
};

// Get progress for a specific user 
const getProgress = async (req, res) => {
  try {
    const { userId, robotId } = req.query;
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

model.exports = { saveProgress, getProgress };