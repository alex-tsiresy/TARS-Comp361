const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // or 'Member', depending on your user model name
    required: true,
  },
  robotId: {
    type: String,
    required: true,
  },
  position: {
    x: { type: Number, required: true },
    z: { type: Number, required: true },
  },
  height: { type: Number },
  coordinates: {
    x: { type: Number },
    z: { type: Number },
  },
  behaviorGoal: { type: String, default: "random" },
  speed: { type: Number, default: 0.5 },
  capabilities: {
    maxSpeed: { type: Number, default: 0.5 },
    sensorRange: { type: Number, default: 100 },
    turnRate: { type: Number, default: 0.05 },
    batteryCapacity: { type: Number, default: 100 },
    batteryLevel: { type: Number, default: 100 },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Progress', ProgressSchema);