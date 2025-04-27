require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const serverless   = require('serverless-http');

const app = express();
const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");
const progressRoutes = require("./routes/progressRoutes");


app.use("/", (req, res) => {
  res.send("Welcome to the Mars Rover API");
}
);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}; connectDB();

const corsOptions = {
  origin: ["https://tars-mars-rover.vercel.app", "https://tars-mars-rover.vercel.app/:1", "http://localhost:5173"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, 
};

// Middleware
//app.use(cors(corsOptions)); 
app.use(cors({origin: '*' }))
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes); 
app.use("/api/terrain-images", imageRoutes);
app.use("/api/progress", progressRoutes);

module.exports = serverless(app);