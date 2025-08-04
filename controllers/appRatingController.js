const AppRating = require("../models/AppRating");

// Create a new app rating and feedback
exports.createAppRating = async (req, res) => {
    try {
        const { rating, feedback } = req.body;
        const userId = req.user._id;

        const newAppRating = new AppRating({
            userId,
            rating,
            feedback
        });

        await newAppRating.save();
        res.status(201).json({ message: "App rating and feedback submitted successfully", rating: newAppRating });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all app ratings and feedback
exports.getAllAppRatings = async (req, res) => {
    try {
        const appRatings = await AppRating.find();
        res.status(200).json(appRatings);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// // Get app ratings and feedback by user
// exports.getAppRatingsByUser = async (req, res) => {
//     try {
//         const userId = req.user._id;

//         const appRatings = await AppRating.find({ userId });
//         res.status(200).json(appRatings);
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };