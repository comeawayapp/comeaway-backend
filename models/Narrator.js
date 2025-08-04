const mongoose = require("mongoose");

const NarratorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    bio: { type: String },
    avatar: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Narrator', NarratorSchema);