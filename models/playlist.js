const mongoose = require("mongoose");

const PlaylistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    sounds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sound' }],
});

module.exports = mongoose.model('Playlist', PlaylistSchema);