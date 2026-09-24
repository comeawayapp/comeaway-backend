const Mix = require("../models/mix");
const logger = require("../utils/logger");
const spacesService = require("../services/spacesService");

const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveOptionalTextField(value) {
  if (value === undefined) return { skip: true };
  if (value === null || value === "") return { value: null };
  const trimmed = String(value).trim();
  return { value: trimmed || null };
}

function parseCategories(categories) {
  let parsed;
  if (typeof categories === "string") {
    try {
      parsed = JSON.parse(categories);
    } catch (_) {
      parsed = [categories];
    }
  } else if (Array.isArray(categories)) {
    parsed = categories;
  } else {
    parsed = [categories];
  }
  if (!Array.isArray(parsed)) parsed = [parsed];
  return parsed;
}

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

exports.createMix = async (req, res) => {
  try {
    const {
      title,
      description,
      categories,
      status,
      thumbnail,
      soundFile,
      duration,
      narrator,
      author,
    } = req.body;

    if (!title || !categories || !status || !thumbnail || !soundFile || !duration) {
      return res.status(400).json({
        message:
          "title, categories, status, thumbnail, soundFile, and duration are required",
      });
    }

    let narratorValue = null;
    const resolvedNarrator = resolveOptionalTextField(narrator);
    if (!resolvedNarrator.skip) narratorValue = resolvedNarrator.value;
    const resolvedAuthor = resolveOptionalTextField(author);
    const authorValue = resolvedAuthor.skip ? null : resolvedAuthor.value;

    const existing = await Mix.findOne({ title: title.trim() });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Mix already exists with this title" });
    }

    let parsedCategories;
    try {
      parsedCategories = parseCategories(categories);
    } catch (parseErr) {
      return res.status(400).json({
        message: "Invalid categories format. Must be a valid array or JSON string.",
      });
    }

    const newMix = new Mix({
      title,
      description,
      soundFile,
      thumbnail,
      categories: parsedCategories,
      status,
      narrator: narratorValue,
      author: authorValue,
      addedDate: new Date(),
      duration,
      uploadStatus: "completed",
    });

    await newMix.save();
    logger.info("Mix saved successfully", { mixId: newMix._id });

    return res.status(201).json({
      message: "Mix created successfully",
      mixId: newMix._id,
      uploadStatus: "completed",
    });
  } catch (error) {
    logger.error("Error creating mix", { error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getMixes = async (req, res) => {
  try {
    const { narrator, author, category } = req.query;
    const filter = {};

    if (narrator && narrator !== "All") {
      filter.narrator = {
        $regex: escapeRegex(String(narrator).trim()),
        $options: "i",
      };
    }

    if (author && author !== "All") {
      filter.author = {
        $regex: escapeRegex(String(author).trim()),
        $options: "i",
      };
    }

    if (category && category !== "All") {
      filter.categories = category;
    }

    const mixes = await Mix.find(filter).sort({ addedDate: -1 });
    res.status(200).json(mixes.map(mapMixResponse));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getMixById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing mix id" });
    }
    const mix = await Mix.findById(id);
    if (!mix) {
      return res.status(404).json({ message: "Mix not found" });
    }
    res.status(200).json(mapMixResponse(mix));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateMix = async (req, res) => {
  try {
    const {
      title,
      description,
      categories,
      status,
      soundFile,
      thumbnail,
      duration,
      narrator,
      author,
    } = req.body;
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing mix id" });
    }

    const mix = await Mix.findById(id);
    if (!mix) {
      return res.status(404).json({ message: "Mix not found" });
    }

    if (soundFile && !isValidUrl(soundFile)) {
      return res.status(400).json({ message: "Invalid sound file URL" });
    }
    if (thumbnail && !isValidUrl(thumbnail)) {
      return res.status(400).json({ message: "Invalid thumbnail URL" });
    }

    let parsedCategories = mix.categories;
    if (categories) {
      try {
        parsedCategories = parseCategories(categories);
      } catch (_) {
        return res.status(400).json({
          message:
            "Invalid categories format. Must be a valid array or JSON string.",
        });
      }
    }

    const resolvedNarrator = resolveOptionalTextField(narrator);
    if (!resolvedNarrator.skip) mix.narrator = resolvedNarrator.value;

    const resolvedAuthor = resolveOptionalTextField(author);
    if (!resolvedAuthor.skip) mix.author = resolvedAuthor.value;

    mix.title = title || mix.title;
    mix.description = description || mix.description;
    mix.categories = parsedCategories;
    mix.status = status || mix.status;
    if (duration !== undefined) mix.duration = duration;
    if (soundFile) mix.soundFile = soundFile;
    if (thumbnail) mix.thumbnail = thumbnail;

    await mix.save();
    res.status(200).json({
      message: "Mix updated successfully",
      mix: mapMixResponse(mix),
    });
  } catch (error) {
    logger.error("Error updating mix", { error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteMix = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing mix id" });
    }

    const mix = await Mix.findById(id);
    if (!mix) {
      return res.status(404).json({ message: "Mix not found" });
    }

    try {
      if (spacesService.isConfigured()) {
        const baseUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/`;
        const soundObjectKey = mix.soundFile?.startsWith(baseUrl)
          ? mix.soundFile.replace(baseUrl, "")
          : null;
        const thumbnailObjectKey = mix.thumbnail?.startsWith(baseUrl)
          ? mix.thumbnail.replace(baseUrl, "")
          : null;

        if (soundObjectKey) await spacesService.deleteFile(soundObjectKey);
        if (thumbnailObjectKey)
          await spacesService.deleteFile(thumbnailObjectKey);
      }
    } catch (spacesDeleteErr) {
      logger.warn("Failed to delete mix files from Spaces", {
        error: spacesDeleteErr.message,
        mixId: id,
      });
    }

    await Mix.findByIdAndDelete(id);
    res.status(200).json({ message: "Mix deleted successfully" });
  } catch (error) {
    logger.error("Error deleting mix", { error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
