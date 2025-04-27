// server.js
require("dotenv").config();
const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const serverless = require("serverless-http");

const authRoutes     = require("./routes/authRoutes");
const imageRoutes    = require("./routes/imageRoutes");
const progressRoutes = require("./routes/progressRoutes");

const app = express();

const allowedOrigins = [
  "https://tars-mars-rover.vercel.app",
  "http://localhost:5173"
];
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET","HEAD","PUT","PATCH","POST","DELETE","OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type","Authorization"]
}));

app.options("*", cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to the Mars Rover API");
});

app.use("/api/auth",      authRoutes);
app.use("/api/terrain-images", imageRoutes);
app.use("/api/progress",  progressRoutes);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

module.exports = serverless(app);
