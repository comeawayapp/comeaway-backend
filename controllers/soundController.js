const mongoose = require("mongoose");
const Sound = require("../models/sound");
const multer = require("multer");
const path = require("path");
const playedSound = require("../models/playedSound");
const { parseFile } = require("music-metadata");
const logger = require("../utils/logger");
const spacesService = require("../services/spacesService");
const fs = require("fs"); // Added for local file cleanup
const mime = require("mime-types"); // Fixed: changed from 'mime-type' to 'mime-types'

// Set up multer for temporary file storage (files will be uploaded to Spaces after processing)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath =
      file.fieldname === "soundFile" ? "uploads/sounds" : "uploads/thumbnails";
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for files
    fieldSize: 100 * 1024 * 1024, // 100MB limit for fields
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

    const soundFilePath = req.files.soundFile[0].path;
    const thumbnailPath = req.files.thumbnail[0].path;

    logger.debug('Local file paths', { soundFilePath, thumbnailPath });

    // Extract duration using music-metadata from local file
    let duration = null;
    try {
      logger.debug('Extracting audio metadata from local file');
      const metadata = await parseFile(soundFilePath);
      duration = metadata.format.duration;
      logger.debug('Audio metadata extracted', { duration });
    } catch (metaErr) {
      logger.warn("Could not extract duration", {
        error: metaErr.message,
        filePath: soundFilePath
      });
    }
    console.log(categories, "categories");

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
      soundFile: 'pending', // Placeholder - will be updated after upload
      thumbnail: 'pending', // Placeholder - will be updated after upload
      categories: parsedCategories,
      status,
      addedDate: new Date(),
      duration,
      uploadStatus: 'uploading' // Track upload status
    });

    logger.info("New sound object created", {
      title: newSound.title,
      status: newSound.status,
      duration: newSound.duration,
      soundId: newSound._id
    });

    // Save the sound to the database
    await newSound.save();
    logger.info("Sound saved successfully", { soundId: newSound._id });

    // Return response immediately
    res.status(201).json({
      message: "Sound created successfully",
      soundId: newSound._id,
      uploadStatus: 'uploading'
    });

    // Start asynchronous file uploads
    uploadFilesAsync(newSound._id, soundFilePath, thumbnailPath, parsedCategories);

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

// Asynchronous file upload function
const uploadFilesAsync = async (soundId, soundFilePath, thumbnailPath, categories) => {
  try {
    logger.info('Starting asynchronous file uploads', { soundId });

    let soundFileUrl, thumbnailUrl;

    if (spacesService.isConfigured()) {
      // Upload sound file to Spaces
      const soundExt = path.extname(soundFilePath).toLowerCase();
      const cleanSoundFilename = `sound-${Date.now()}${soundExt}`;
      const soundObjectKey = process.env.NODE_ENV === 'production' ? `prod/sounds/${cleanSoundFilename}` : `dev/sounds/${cleanSoundFilename}`;
      
      soundFileUrl = await spacesService.uploadFile(
        soundFilePath, 
        soundObjectKey, 
        'audio/mpeg',
        'public-read',
        (uploaded, total) => {
          logger.info(`Sound file upload progress: ${Math.round((uploaded/total)*100)}%`, { soundId });
        }
      );

      // Upload thumbnail to Spaces
      const ext = path.extname(thumbnailPath).toLowerCase();
      const cleanFilename = `thumbnail-${Date.now()}${ext}`;
      const thumbnailObjectKey = process.env.NODE_ENV === 'production' 
        ? `prod/thumbnails/${cleanFilename}` 
        : `dev/thumbnails/test/${cleanFilename}`;
      
      const mimeType = mime.lookup(ext) || "application/octet-stream";
      
      thumbnailUrl = await spacesService.uploadFile(
        thumbnailPath,
        thumbnailObjectKey,
        mimeType,
        'public-read',
        (uploaded, total) => {
          logger.info(`Thumbnail upload progress: ${Math.round((uploaded/total)*100)}%`, { soundId });
        }
      );

      logger.info('Files uploaded to DigitalOcean Spaces successfully', {
        soundId,
        soundFileUrl,
        thumbnailUrl
      });

      // Clean up local files after successful upload
      try {
        fs.unlinkSync(soundFilePath);
        fs.unlinkSync(thumbnailPath);
        logger.debug('Local files cleaned up successfully', { soundId });
      } catch (cleanupErr) {
        logger.warn('Failed to cleanup local files', { error: cleanupErr.message, soundId });
      }

    } else {
      // Fallback to local storage if Spaces not configured
      logger.warn('DigitalOcean Spaces not configured, using local storage', { soundId });
      soundFileUrl = soundFilePath;
      thumbnailUrl = thumbnailPath;
    }

    // Update sound record with file URLs
    await Sound.findByIdAndUpdate(soundId, {
      soundFile: soundFileUrl,
      thumbnail: thumbnailUrl,
      uploadStatus: 'completed',
      uploadCompletedAt: new Date()
    });

    logger.info('Sound record updated with file URLs', { 
      soundId, 
      soundFileUrl, 
      thumbnailUrl 
    });

  } catch (uploadErr) {
    logger.error('Failed to upload files asynchronously', { 
      error: uploadErr.message, 
      soundId 
    });
    
    // Update sound record with error status
    await Sound.findByIdAndUpdate(soundId, {
      uploadStatus: 'failed',
      uploadError: uploadErr.message
    });
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

      // Handle file updates
      let newSoundFileUrl = sound.soundFile;
      let newThumbnailUrl = sound.thumbnail;

      if (req.files && req.files.soundFile) {
        try {
          if (spacesService.isConfigured()) {
            // Upload new sound file to Spaces
            const soundObjectKey = `sounds/${Date.now()}-${path.basename(req.files.soundFile[0].path)}`;
            newSoundFileUrl = await spacesService.uploadFile(
              req.files.soundFile[0].path,
              soundObjectKey,
              'audio/mpeg'
            );

            // Delete old sound file from Spaces if it exists there
            const oldSoundObjectKey = spacesService.getObjectKeyFromUrl(sound.soundFile);
            if (oldSoundObjectKey) {
              await spacesService.deleteFile(oldSoundObjectKey);
              logger.info('Old sound file deleted from DigitalOcean Spaces', { objectKey: oldSoundObjectKey });
            }

            // Clean up local file
            try {
              fs.unlinkSync(req.files.soundFile[0].path);
            } catch (cleanupErr) {
              logger.warn('Failed to cleanup local sound file', { error: cleanupErr.message });
            }
          } else {
            newSoundFileUrl = req.files.soundFile[0].path;
          }
        } catch (uploadErr) {
          logger.error('Failed to upload new sound file to DigitalOcean Spaces', { error: uploadErr.message });
          newSoundFileUrl = req.files.soundFile[0].path; // Fallback to local
        }
      }

      if (req.files && req.files.thumbnail) {
        try {
          if (spacesService.isConfigured()) {
            // Upload new thumbnail to Spaces with clean filename
            const ext = path.extname(req.files.thumbnail[0].path).toLowerCase();
            const cleanFilename = `thumbnail-${Date.now()}${ext}`;
            const thumbnailObjectKey = process.env.NODE_ENV === 'production' 
              ? `prod/thumbnails/${cleanFilename}` 
              : `dev/thumbnails/test/${cleanFilename}`;
            
            const mimeType = mime.lookup(ext) || "application/octet-stream";
            
            newThumbnailUrl = await spacesService.uploadFile(
              req.files.thumbnail[0].path,
              thumbnailObjectKey,
              mimeType
            );

            // Delete old thumbnail from Spaces if it exists there
            const oldThumbnailObjectKey = spacesService.getObjectKeyFromUrl(sound.thumbnail);
            if (oldThumbnailObjectKey) {
              await spacesService.deleteFile(oldThumbnailObjectKey);
              logger.info('Old thumbnail deleted from DigitalOcean Spaces', { objectKey: oldThumbnailObjectKey });
            }

            // Clean up local file
            try {
              fs.unlinkSync(req.files.thumbnail[0].path);
            } catch (cleanupErr) {
              logger.warn('Failed to cleanup local thumbnail file', { error: cleanupErr.message });
            }
          } else {
            newThumbnailUrl = req.files.thumbnail[0].path;
          }
        } catch (uploadErr) {
          logger.error('Failed to upload new thumbnail to DigitalOcean Spaces', { error: uploadErr.message });
          newThumbnailUrl = req.files.thumbnail[0].path; // Fallback to local
        }
      }

      // Update sound details
      sound.title = title || sound.title;
      sound.description = description || sound.description;
      sound.soundFile = newSoundFileUrl;
      sound.thumbnail = newThumbnailUrl;
      sound.categories = categories ? JSON.parse(categories) : sound.categories;
      sound.status = status || sound.status;

      logger.info("Updated Sound", {
        soundId: sound._id,
        title: sound.title,
        soundFile: sound.soundFile,
        thumbnail: sound.thumbnail
      });

      await sound.save();
      res.status(200).json({ message: "Sound updated successfully" });
    } catch (error) {
      logger.error('Error updating sound', { error: error.message, soundId: req.params.id });
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

    const sound = await Sound.findById(id);
    if (!sound) {
      return res.status(404).json({ message: "Sound not found" });
    }

    // Delete files from DigitalOcean Spaces if they exist there
    try {
      if (spacesService.isConfigured()) {
        // Extract object keys from URLs
        const soundObjectKey = spacesService.getObjectKeyFromUrl(sound.soundFile);
        const thumbnailObjectKey = spacesService.getObjectKeyFromUrl(sound.thumbnail);

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