const mongoose = require("mongoose");

const SoundSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  soundFile: { type: String },
  thumbnail: { type: String },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  status: { type: String, enum: ["Standard", "Premium"], default: "Standard" },
  playCount: { type: Number, default: 0 }, // Add this line
  addedDate: { type: Date, default: Date.now },
  duration: { type: Number }, // duration in seconds
  uploadStatus: { 
    type: String, 
    enum: ["uploading", "completed", "failed"], 
    default: "uploading" 
  },
  uploadError: { type: String }, // Error message if upload fails
  uploadCompletedAt: { type: Date } // When upload completed
});

module.exports = mongoose.model("Sound", SoundSchema);
