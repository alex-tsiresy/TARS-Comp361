require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");
const progressRoutes = require("./routes/progressRoutes");

// Start the server
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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
  origin: ["http://localhost:5173"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, 
};

// Middleware
app.use(cors(corsOptions)); 
app.use(express.json()); 

// Routes
app.use("/api/auth", authRoutes); 
app.use("/api/terrain-images", imageRoutes);
app.use("/api/progress", progressRoutes);

