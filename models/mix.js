const mongoose = require("mongoose");

const MixSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  soundFile: { type: String },
  thumbnail: { type: String },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "MixCategory" }],
  status: { type: String, enum: ["Standard", "Premium"], default: "Standard" },
  playCount: { type: Number, default: 0 },
  addedDate: { type: Date, default: Date.now },
  duration: { type: Number },
  narrator: {
    type: String,
    trim: true,
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

MixSchema.index({ narrator: 1 });
MixSchema.index({ author: 1 });
MixSchema.index({ categories: 1 });

module.exports = mongoose.model("Mix", MixSchema);
