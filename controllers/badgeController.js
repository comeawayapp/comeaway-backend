const mongoose = require("mongoose");
const PlayedSound = require("../models/playedSound");

// Get badge progress for the authenticated user
exports.getBadgeProgress = async (req, res) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : req.user;
    if (!userId) {
      return res.status(400).json({ message: "User ID not found in request." });
    }

    // Ensure userId is always a valid ObjectId
    const userObjectId =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

    // Total played tracks
    const playedTracks = await PlayedSound.countDocuments({
      user: userObjectId,
    });

    // Unique days calculation
    const uniqueDaysAgg = await PlayedSound.aggregate([
      {
        $match: { user: userObjectId },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$playedAt" },
          },
        },
      },
      { $count: "uniqueDays" },
    ]);
    const uniqueDays =
      uniqueDaysAgg.length > 0 ? uniqueDaysAgg[0].uniqueDays : 0;

    return res
      .status(200)
      .json({ playedTracks, uniqueDays, userId: userObjectId.toString() });
  } catch (err) {
    console.error("Error in getBadgeProgress:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};
