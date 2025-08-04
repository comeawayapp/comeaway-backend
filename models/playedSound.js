const mongoose = require('mongoose');

const PlayedSoundSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sound: { type: mongoose.Schema.Types.ObjectId, ref: 'Sound', required: true },
  playedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlayedSound', PlayedSoundSchema);