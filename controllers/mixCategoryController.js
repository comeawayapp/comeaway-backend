const MixCategory = require("../models/mixCategory");
const Mix = require("../models/mix");

function mapMixResponse(mix) {
  return {
    _id: mix._id,
    title: mix.title,
    description: mix.description,
    soundFile: mix.soundFile,
    thumbnail: mix.thumbnail,
    categories: mix.categories,
    status: mix.status,
    playCount: mix.playCount,
    addedDate: mix.addedDate,
    duration: mix.duration,
    narrator: mix.narrator || null,
    author: mix.author || null,
    uploadStatus:
      mix.soundFile == "pending" ? mix.uploadStatus : "completed",
  };
}

exports.createMixCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: "name and slug are required" });
    }

    const existing = await MixCategory.findOne({
      $or: [{ name }, { slug }],
    });
    if (existing) {
      return res.status(400).json({ message: "Mix category already exists" });
    }

    const newCategory = new MixCategory({
      name,
      slug,
      description,
      createdBy: req.user?._id,
      publishedDate: new Date(),
    });

    await newCategory.save();
    res.status(201).json({
      message: "Mix category created successfully",
      category: newCategory,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getMixCategories = async (req, res) => {
  try {
    const categories = await MixCategory.find().sort({ publishedDate: -1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getMixCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing category id" });
    }

    const category = await MixCategory.findById(id).populate(
      "createdBy",
      "firstname lastname email"
    );
    if (!category) {
      return res.status(404).json({ message: "Mix category not found" });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getMixCategoryWithMixes = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing category id" });
    }

    const category = await MixCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Mix category not found" });
    }

    const mixes = await Mix.find({ categories: id }).sort({ addedDate: -1 });

    res.status(200).json({
      category,
      mixes: mixes.map(mapMixResponse),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateMixCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing category id" });
    }

    const category = await MixCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Mix category not found" });
    }

    category.name = name || category.name;
    category.slug = slug || category.slug;
    if (description !== undefined) category.description = description;
    category.publishedDate = new Date();

    await category.save();
    res.status(200).json({
      message: "Mix category updated successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteMixCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing category id" });
    }

    const category = await MixCategory.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: "Mix category not found" });
    }

    res.status(200).json({ message: "Mix category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
