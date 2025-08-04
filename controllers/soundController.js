const mongoose = require("mongoose");
const Sound = require("../models/sound");
const multer = require("multer");
const path = require("path");
const playedSound = require("../models/playedSound");
const mm = require("music-metadata"); // Add music-metadata for audio duration extraction
const logger = require("../utils/logger");

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath =
      file.fieldname === "soundFile" ? "uploads/sounds" : "uploads/thumbnails";
    cb(null, uploadPath); // Upload destination
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for files
    fieldSize: 50 * 1024 * 1024, // 50MB limit for fields
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes =
      file.fieldname === "soundFile" ?
        ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a"]
      : ["image/jpeg", "image/png", "image/gif", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only audio files (MP3, WAV, M4A) are allowed for soundFile and images for thumbnail."
        )
      );
    }
  },
}).fields([
  { name: "soundFile", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// Create a wrapper function that handles multer errors
const createSoundWithErrorHandling = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      logger.error('Multer upload error', {
        error: err.message,
        code: err.code,
        field: err.field,
        path: req.path,
        headers: req.headers,
        body: req.body
      });
      
      return res.status(400).json({ 
        message: "File upload error", 
        error: err.message 
      });
    }
    
    logger.debug('Multer upload successful', {
      files: req.files ? Object.keys(req.files) : null,
      body: req.body
    });
    
    // Call the actual controller function
    createSound(req, res);
  });
};

// Export the upload middleware
exports.upload = upload;

// Export the wrapper function for the route
exports.createSoundWithUpload = createSoundWithErrorHandling;

// The actual controller function (without multer handling)
const createSound = async (req, res) => {
  try {
    logger.info('Creating new sound', {
      body: req.body,
      files: req.files ? Object.keys(req.files) : null,
      userId: req.user ? req.user._id : null
    });

    const { title, description, categories, status } = req.body;
    
    // Validate required fields
    if (!title || !description || !categories || !status) {
      logger.error('Missing required fields for sound creation', {
        title: !!title,
        description: !!description,
        categories: !!categories,
        status: !!status
      });
      return res.status(400).json({
        message: "title, description, categories, and status are required",
      });
    }

    // Validate files
    if (!req.files || !req.files.soundFile || !req.files.thumbnail) {
      logger.error('Missing required files for sound creation', {
        hasFiles: !!req.files,
        hasSoundFile: req.files ? !!req.files.soundFile : false,
        hasThumbnail: req.files ? !!req.files.thumbnail : false
      });
      return res
        .status(400)
        .json({ message: "Sound file and thumbnail are required" });
    }

    // Check for duplicate title
    const existingSound = await Sound.findOne({ title: title.trim() });
    if (existingSound) {
      logger.error('Duplicate sound title attempted', { title: title.trim() });
      return res
        .status(400)
        .json({ message: "Song already exist with this title" });
    }

    const soundFile = req.files.soundFile[0].path;
    const thumbnail = req.files.thumbnail[0].path;

    logger.debug('File paths', { soundFile, thumbnail });

    // Extract duration using music-metadata
    let duration = null;
    try {
      // Normalize file path for cross-platform compatibility
      let normalizedPath = soundFile.replace(/\\/g, "/");
      const filePath =
        path.isAbsolute(normalizedPath) ? normalizedPath : (
          path.join(__dirname, "..", normalizedPath)
        );
      
      logger.debug('Extracting audio metadata', { filePath });
      const metadata = await mm.parseFile(filePath);
      duration = metadata.format.duration; // duration in seconds (float)
      logger.debug('Audio metadata extracted', { duration });
    } catch (metaErr) {
      logger.warn("Could not extract duration", { 
        error: metaErr.message, 
        filePath: soundFile 
      });
    }

    // Parse categories
    let parsedCategories;
    try {
      parsedCategories = JSON.parse(categories);
      logger.debug('Categories parsed successfully', { categories: parsedCategories });
    } catch (parseErr) {
      logger.error('Failed to parse categories JSON', { 
        categories, 
        error: parseErr.message 
      });
      return res.status(400).json({ 
        message: "Invalid categories format. Must be valid JSON array." 
      });
    }

    // Create a new sound
    const newSound = new Sound({
      title,
      description,
      soundFile,
      thumbnail,
      categories: parsedCategories,
      status,
      addedDate: new Date(),
      duration, // Save duration if available
    });

    logger.info("New sound object created", { 
      title: newSound.title,
      status: newSound.status,
      duration: newSound.duration
    });

    // Save the sound to the database
    await newSound.save();
    logger.info("Sound saved successfully", { soundId: newSound._id });
    
    res.status(201).json({ 
      message: "Sound created successfully",
      soundId: newSound._id 
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
    const sounds = await Sound.find();
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
exports.updateSound = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error uploading files", error: err.message });
    }
    try {
      const { title, description, categories, status } = req.body;
      const { id } = req.params;
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: "Invalid or missing sound id" });
      }
      const sound = await Sound.findById(id);
      if (!sound) {
        return res.status(404).json({ message: "Sound not found" });
      }

      // Update sound details
      sound.title = title || sound.title;
      sound.description = description || sound.description;
      sound.soundFile =
        req.files.soundFile ? req.files.soundFile[0].path : sound.soundFile; // Update file path if a new file is uploaded
      sound.thumbnail =
        req.files.thumbnail ? req.files.thumbnail[0].path : sound.thumbnail;
      sound.categories = categories ? JSON.parse(categories) : sound.categories;
      sound.status = status || sound.status;
      console.log("Updated Sound:", sound);

      await sound.save();
      res.status(200).json({ message: "Sound updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });
};
exports.deleteSound = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing sound id" });
    }
    const sound = await Sound.findByIdAndDelete(id);
    if (!sound) {
      return res.status(404).json({ message: "Sound not found" });
    }
    res.status(200).json({ message: "Sound deleted successfully" });
  } catch (error) {
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
