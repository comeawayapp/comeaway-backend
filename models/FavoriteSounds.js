const mongoose = require("mongoose");

const FavoriteSoundSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    soundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sound', required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FavoriteSound', FavoriteSoundSchema);