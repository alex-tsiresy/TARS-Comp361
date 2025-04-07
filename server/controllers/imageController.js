const MarsPicture = require("../models/MarsPicture");

const getImageById = async (req, res) => {
  try {
    const image = await MarsPicture.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }
    res.contentType(image.image.contentType);
    res.send(image.image.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllImages = async (req, res) => {
  try {
    const images = await MarsPicture.find();
    if (!images || images.length === 0) {
      return res.status(404).json({ message: "No images found" });
    }

    const imagesResponse = images.map((img) => ({
      _id: img._id,
      title: img.title,
      description: img.description,
      contentType: img.image.contentType,
      data: img.image.data.toString("base64"),
    }));
    res.json(imagesResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

model.exports = { getImageById, getAllImages };