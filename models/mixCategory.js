const mongoose = require("mongoose");

const MixCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  publishedDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MixCategory", MixCategorySchema);
