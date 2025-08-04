const FavoriteSound = require("../models/FavoriteSounds");
//const Sound = require("../models/sound");

// Add a sound to favorites
exports.addFavoriteSound = async (req, res) => {
  try {
    const { soundId } = req.body;
    const userId = req.user && req.user._id;
    if (!soundId || !userId) {
      return res
        .status(400)
        .json({ message: "soundId and userId are required" });
    }
    if (!soundId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid soundId format" });
    }

    // Check if the sound already exists in favorites
    const existingFavorite = await FavoriteSound.findOne({ userId, soundId });
    if (existingFavorite) {
      return res.status(400).json({ message: "Sound is already in favorites" });
    }

    const favoriteSound = new FavoriteSound({ userId, soundId });
    await favoriteSound.save();

    res
      .status(201)
      .json({
        message: "Sound added to favorites successfully",
        favoriteSound,
      });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove a sound from favorites
exports.removeFavoriteSound = async (req, res) => {
  try {
    const { soundId } = req.body;
    const userId = req.user && req.user._id;
    if (!soundId || !userId) {
      return res
        .status(400)
        .json({ message: "soundId and userId are required" });
    }
    if (!soundId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid soundId format" });
    }

    const favoriteSound = await FavoriteSound.findOneAndDelete({
      userId,
      soundId,
    });
    if (!favoriteSound) {
      return res.status(404).json({ message: "Sound not found in favorites" });
    }

    res
      .status(200)
      .json({ message: "Sound removed from favorites successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all favorite sounds for a user
exports.getFavoriteSounds = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const favoriteSounds = await FavoriteSound.find({ userId }).populate(
      "soundId"
    );
    res.status(200).json(favoriteSounds);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
