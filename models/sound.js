const mongoose = require("mongoose");

const SoundSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  soundFile: { type: String },
  thumbnail: { type: String },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  status: { type: String, enum: ["Standard", "Premium"], default: "Standard" },
  playCount: { type: Number, default: 0 },
  addedDate: { type: Date, default: Date.now },
  duration: { type: Number }, // duration in seconds
  narrator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Narrator",
    default: null,
  },
  author: {
    type: String,
    trim: true,
    default: null,
  },
  uploadStatus: {
    type: String,
    enum: ["uploading", "completed", "failed"],
    default: "uploading",
  },
  uploadError: { type: String },
  uploadCompletedAt: { type: Date },
});

SoundSchema.index({ narrator: 1 });
SoundSchema.index({ author: 1 });

module.exports = mongoose.model("Sound", SoundSchema);
