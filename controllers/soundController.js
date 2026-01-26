const Sound = require("../models/sound");
const path = require("path");
const playedSound = require("../models/playedSound");
const { parseFile } = require("music-metadata");
const logger = require("../utils/logger");
const spacesService = require("../services/spacesService");
const fs = require("fs"); // Added for local file cleanup
const mime = require("mime-types"); // Fixed: changed from 'mime-type' to 'mime-types'

// Helper function to validate URLs
const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};



// The actual controller function (without multer handling)
const createSound = async (req, res) => {
  try {
    logger.info('Creating new sound', {
      body: req.body,
      files: req.files ? Object.keys(req.files) : null,
      userId: req.user ? req.user._id : null
    });

    const { title, description, categories, status, thumbnail, soundFile, duration } = req.body;

    // Validate required fields
    if (!title || !categories || !status || !thumbnail || !soundFile || !duration) {
      logger.error('Missing required fields for sound creation', {
        title: !!title,
        description: !!description,
        categories: !!categories,
        status: !!status,
        thumbnail: !!thumbnail,
        soundFile: !!soundFile,
        duration: !!duration
      });
      return res.status(400).json({
        message: "title,categories, status, thumbnail, and soundFile are required",
      });
    }

    // Check for duplicate title
    const existingSound = await Sound.findOne({ title: title.trim() });
    if (existingSound) {
      logger.error('Duplicate sound title attempted', { title: title.trim() });
      return res
        .status(400)
        .json({ message: "Song already exist with this title" });
    }

    // Parse categories - handle both string and array formats
    let parsedCategories;
    try {
      if (typeof categories === 'string') {
        // Try to parse as JSON first
        try {
          parsedCategories = JSON.parse(categories);
        } catch (jsonErr) {
          // If JSON parsing fails, treat as single category
          parsedCategories = [categories];
        }
      } else if (Array.isArray(categories)) {
        parsedCategories = categories;
      } else {
        // If it's a single value, wrap it in an array
        parsedCategories = [categories];
      }

      // Ensure it's always an array
      if (!Array.isArray(parsedCategories)) {
        parsedCategories = [parsedCategories];
      }

      logger.debug('Categories parsed successfully', { categories: parsedCategories });
    } catch (parseErr) {
      logger.error('Failed to parse categories', {
        categories,
        error: parseErr.message
      });
      return res.status(400).json({
        message: "Invalid categories format. Must be a valid array or JSON string."
      });
    }

    // Create a new sound immediately (without file URLs)
    const newSound = new Sound({
      title,
      description,
      soundFile, 
      thumbnail,
      categories: parsedCategories,
      status,
      addedDate: new Date(),
      duration,
      uploadStatus: 'completed' // Track upload status
    });
    // Save the sound to the database
    await newSound.save();
    logger.info("Sound saved successfully", { soundId: newSound._id });

    // Return response immediately
    return res.status(201).json({
      message: "Sound created successfully",
      soundId: newSound._id,
      uploadStatus: 'completed'
    });

  } catch (error) {
    logger.error('Error creating sound', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files ? Object.keys(req.files) : null
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getSounds = async (req, res) => {
  try {
    const sounds = await Sound.find().sort({ addedDate: -1 }); // Sort from newest to oldest
    // Always include duration in the response
    const result = sounds.map((sound) => ({
      _id: sound._id,
      title: sound.title,
      description: sound.description,
      soundFile: sound.soundFile,
      thumbnail: sound.thumbnail,
      categories: sound.categories,
      status: sound.status,
      playCount: sound.playCount,
      addedDate: sound.addedDate,
      duration: sound.duration, // Ensure duration is included
      uploadStatus: sound.soundFile == 'pending' ? sound.uploadStatus : "completed",
    }));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getSoundById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing sound id" });
    }
    const sound = await Sound.findById(id);
    if (!sound) {
      return res.status(404).json({ message: "Sound not found" });
    }
    res.status(200).json(sound);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateSound = async (req, res) => {
  try {
    const { title, description, categories, status, soundFile, thumbnail } = req.body;
    const { id } = req.params;
    
    logger.info('UpdateSound request received', { 
      id, 
      body: req.body,
      soundFile: !!soundFile, 
      thumbnail: !!thumbnail,
      thumbnailValue: thumbnail 
    });
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing sound id" });
    }

    const sound = await Sound.findById(id);
    if (!sound) {
      return res.status(404).json({ message: "Sound not found" });
    }

    // Validate URLs if provided
    if (soundFile && !isValidUrl(soundFile)) {
      return res.status(400).json({ message: "Invalid sound file URL" });
    }
    
    if (thumbnail && !isValidUrl(thumbnail)) {
      return res.status(400).json({ message: "Invalid thumbnail URL" });
    }

    // Parse categories if provided
    let parsedCategories = sound.categories;
    if (categories) {
      try {
        if (typeof categories === 'string') {
          try {
            parsedCategories = JSON.parse(categories);
          } catch (jsonErr) {
            parsedCategories = [categories];
          }
        } else if (Array.isArray(categories)) {
          parsedCategories = categories;
        } else {
          parsedCategories = [categories];
        }

        if (!Array.isArray(parsedCategories)) {
          parsedCategories = [parsedCategories];
        }
      } catch (parseErr) {
        logger.error('Failed to parse categories', { categories, error: parseErr.message });
        return res.status(400).json({
          message: "Invalid categories format. Must be a valid array or JSON string."
        });
      }
    }

    // Update sound details
    sound.title = title || sound.title;
    sound.description = description || sound.description;
    sound.categories = parsedCategories;
    sound.status = status || sound.status;
    
    // Update file URLs if provided
    if (soundFile) {
      logger.info('Updating soundFile', { old: sound.soundFile, new: soundFile });
      sound.soundFile = soundFile;
    }
    if (thumbnail) {
      logger.info('Updating thumbnail', { old: sound.thumbnail, new: thumbnail });
      sound.thumbnail = thumbnail;
    }

    logger.info("Updated Sound", {
      soundId: sound._id,
      title: sound.title,
      soundFile: sound.soundFile,
      thumbnail: sound.thumbnail
    });

    await sound.save();
    res.status(200).json({ 
      message: "Sound updated successfully",
      sound: {
        _id: sound._id,
        title: sound.title,
        description: sound.description,
        soundFile: sound.soundFile,
        thumbnail: sound.thumbnail,
        categories: sound.categories,
        status: sound.status
      }
    });

  } catch (error) {
    logger.error('Error updating sound', { error: error.message, soundId: req.params.id });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteSound = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing sound id" });
    }

    const sound = await Sound.findById(id);
    if (!sound) {
      return res.status(404).json({ message: "Sound not found" });
    }

    // Delete files from DigitalOcean Spaces if they exist there
    try {
      if (spacesService.isConfigured()) {
        // Extract object keys from URLs
        const baseUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/`;
        const soundObjectKey = sound.soundFile.startsWith(baseUrl) ? sound.soundFile.replace(baseUrl, '') : null;
        const thumbnailObjectKey = sound.thumbnail.startsWith(baseUrl) ? sound.thumbnail.replace(baseUrl, '') : null;

        if (soundObjectKey) {
          await spacesService.deleteFile(soundObjectKey);
          logger.info('Sound file deleted from DigitalOcean Spaces', { objectKey: soundObjectKey });
        }

        if (thumbnailObjectKey) {
          await spacesService.deleteFile(thumbnailObjectKey);
          logger.info('Thumbnail deleted from DigitalOcean Spaces', { objectKey: thumbnailObjectKey });
        }
      }
    } catch (spacesDeleteErr) {
      logger.warn('Failed to delete files from DigitalOcean Spaces', {
        error: spacesDeleteErr.message,
        soundId: id
      });
      // Continue with local deletion even if Spaces deletion fails
    }

    // Delete the sound from database
    await Sound.findByIdAndDelete(id);
    logger.info('Sound deleted successfully from database', { soundId: id });

    res.status(200).json({ message: "Sound deleted successfully" });
  } catch (error) {
    logger.error('Error deleting sound', { error: error.message, soundId: req.params.id });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getPopularTodaySongs = async (req, res) => {
  try {
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0
      )
    );
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(todayUTC.getUTCDate() + 1);

    console.log("Today:", todayUTC.toISOString());
    console.log("Tomorrow:", tomorrowUTC.toISOString());

    const popular = await playedSound.aggregate([
      {
        $match: {
          playedAt: { $gte: todayUTC, $lt: tomorrowUTC },
        },
      },
      {
        $group: {
          _id: "$sound",
          playCount: { $sum: 1 },
        },
      },
      { $sort: { playCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "sounds",
          localField: "_id",
          foreignField: "_id",
          as: "sound",
        },
      },
      { $unwind: "$sound" },
    ]);

    if (!popular.length) {
      return res.status(200).json([]);
    }

    const result = popular.map((item) => ({
      _id: item.sound._id,
      title: item.sound.title,
      description: item.sound.description,
      soundFile: item.sound.soundFile,
      thumbnail: item.sound.thumbnail,
      categories: item.sound.categories,
      status: item.sound.status,
      playCount: item.playCount,
      addedDate: item.sound.addedDate,
      duration: item.sound.duration, // Ensure duration is included
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching today's popular songs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.logPlayedSound = async (req, res) => {
  try {
    const { userId, soundId } = req.body;
    if (!userId || !soundId) {
      return res
        .status(400)
        .json({ message: "userId and soundId are required" });
    }

    // Create a new play event (or update if already played today, optional)
    await playedSound.create({ user: userId, sound: soundId });

    res.status(201).json({ message: "Sound play logged" });
  } catch (error) {
    console.error("Error logging played sound:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getRecentlyPlayedSounds = async (req, res) => {
  try {
    const { userId } = req.params; // or from token/session
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Populate sound details, sort by playedAt, limit to last 10 unique
    const played = await playedSound
      .find({ user: userId })
      .sort({ playedAt: -1 })
      .populate("sound")
      .exec();

    // Remove duplicates (just the latest play per sound)
    const uniqueSounds = [];
    const seen = new Set();
    for (const entry of played) {
      if (!entry.sound) continue; // skip if sound is null
      if (!seen.has(entry.sound._id.toString())) {
        uniqueSounds.push(entry.sound);
        seen.add(entry.sound._id.toString());
      }
      if (uniqueSounds.length >= 10) break;
    }

    res.status(200).json(uniqueSounds);
  } catch (error) {
    console.error("Error fetching recently played sounds:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Export the createSound function
exports.createSound = createSound;

// Check upload status
exports.getUploadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing sound id" });
    }

    const sound = await Sound.findById(id).select('uploadStatus uploadError soundFile thumbnail');
    if (!sound) {
      return res.status(404).json({ message: "Sound not found" });
    }

    res.status(200).json({
      soundId: sound._id,
      uploadStatus: sound.uploadStatus,
      uploadError: sound.uploadError,
      soundFile: sound.uploadStatus === 'completed' ? sound.soundFile : null,
      thumbnail: sound.uploadStatus === 'completed' ? sound.thumbnail : null
    });
  } catch (error) {
    logger.error('Error checking upload status', { error: error.message, soundId: req.params.id });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

