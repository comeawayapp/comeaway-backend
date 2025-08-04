const Narrator = require("../models/Narrator");

// Get all narrators
exports.getAllNarrators = async (req, res) => {
  try {
    const narrators = await Narrator.find();
    if (!narrators.length) {
      return res.status(404).json({ message: "No narrators found" });
    }
    res.status(200).json(narrators);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createNarrator = async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    if (!name || !bio || !avatar) {
      return res
        .status(400)
        .json({ message: "name, bio, and avatar are required" });
    }
    const newNarrator = new Narrator({
      name,
      bio,
      avatar,
    });
    await newNarrator.save();
    res
      .status(201)
      .json({
        message: "Narrator created successfully",
        narrator: newNarrator,
      });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
