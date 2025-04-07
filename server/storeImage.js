const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const MarsPicture = require('./models/MarsPicture');
require("dotenv").config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const imagesDir = path.join(__dirname, 'mars_images');
    const files = fs.readdirSync(imagesDir);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const filePath = path.join(imagesDir, file);

        const imageData = fs.readFileSync(filePath);

        // Create new MarsPicture document 
        const newPicture = new MarsPicture({
          title: path.basename(file, ext),  
          description: "Mars terrain image",
          image: {
            data: imageData,
            contentType: ext === '.png' ? 'image/png' : 'image/jpeg'
          },
        });

        await newPicture.save();
        console.log(`Stored ${file}`);
      }
    }

    console.log("All images stored successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error storing images:", error);
  }
})();