const Playlist = require("../models/playlist");
const Sound = require("../models/sound");

// Create a new playlist
exports.createPlaylist = async (req, res) => {
  try {
    const { name, userId } = req.body;
    if (!name || !userId) {
      return res.status(400).json({ message: "Name and userId are required" });
    }
    const newPlaylist = new Playlist({
      userId,
      name,
    });
    await newPlaylist.save();
    res.status(201).json({
      message: "Playlist created successfully",
      playlist: newPlaylist,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add sounds to a playlist
exports.addSoundsToPlaylist = async (req, res) => {

  try {
    const { playlistId, soundsIds } = req.body;
    if (!playlistId || !soundsIds) {
      return res
        .status(400)
        .json({ message: "playlistId and soundsIds are required" });
    }
    if (!playlistId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid playlistId format" });
    }
    // Convert soundsIds to array - handle both string and array formats
    let soundIdsArray;
    if (typeof soundsIds === 'string') {
      // Handle comma-separated string
      soundIdsArray = soundsIds.split(",").map(id => id.trim()).filter(id => id);
    } else if (Array.isArray(soundsIds)) {
      // Handle array format
      soundIdsArray = soundsIds.map(id => id.toString()).filter(id => id);
    } else {
      return res.status(400).json({ 
        message: "soundsIds must be either a comma-separated string or an array" 
      });
    }
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Separate already present and new sound IDs
    const alreadyInPlaylist = [];
    const toCheck = [];
    for (const soundId of soundIdsArray) {
      if (!soundId.match(/^[0-9a-fA-F]{24}$/)) continue;
      if (playlist.sounds.includes(soundId)) {
        alreadyInPlaylist.push(soundId);
      } else {
        toCheck.push(soundId);
      }
    }

    // Check if all are already present
    if (toCheck.length === 0) {
      return res.status(409).json({
        message: "Sound Track already exist in the playlist",
        alreadyInPlaylist,
      });
    }

    // Validate remaining sound IDs
    const validSoundIds = [];
    for (const soundId of toCheck) {
      const sound = await Sound.findById(soundId);
      if (sound) {
        validSoundIds.push(soundId);
      }
    }
    if (validSoundIds.length === 0) {
      return res.status(400).json({ message: "No valid sounds to add" });
    }
    playlist.sounds.push(...validSoundIds);
    await playlist.save();
    res
      .status(200)
      .json({ message: "Sounds added to playlist successfully", playlist });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove sounds from a playlist
exports.removeSoundsFromPlaylist = async (req, res) => {
  try {
    const { playlistId, soundsIds } = req.body;
    if (!playlistId || !soundsIds) {
      return res
        .status(400)
        .json({ message: "playlistId and soundsIds are required" });
    }
    if (!playlistId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid playlistId format" });
    }

    // Convert soundsIds to array - handle both string and array formats
    let soundIdsArray;
    if (typeof soundsIds === 'string') {
      // Handle comma-separated string
      soundIdsArray = soundsIds.split(",").map(id => id.trim()).filter(id => id);
    } else if (Array.isArray(soundsIds)) {
      // Handle array format
      soundIdsArray = soundsIds.map(id => id.toString()).filter(id => id);
    } else {
      return res.status(400).json({ 
        message: "soundsIds must be either a comma-separated string or an array" 
      });
    }

    if (!soundIdsArray.length) {
      return res.status(400).json({ message: "No valid sound IDs provided" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Separate sound IDs that are not in the playlist
    const notInPlaylist = [];
    const toRemove = [];
    for (const soundId of soundIdsArray) {
      if (!soundId.match(/^[0-9a-fA-F]{24}$/)) {
        notInPlaylist.push(soundId);
        continue;
      }
      if (!playlist.sounds.includes(soundId)) {
        notInPlaylist.push(soundId);
      } else {
        toRemove.push(soundId);
      }
    }

    if (toRemove.length === 0) {
      return res.status(409).json({
        message: "None of the provided sounds are in the playlist",
        notInPlaylist,
      });
    }

    // Remove valid sound IDs from playlist
    playlist.sounds = playlist.sounds.filter(
      (soundId) => !toRemove.includes(soundId.toString())
    );
    await playlist.save();

    res.status(200).json({
      message: "Sounds removed from playlist successfully",
      removed: toRemove,
      notInPlaylist: notInPlaylist.length ? notInPlaylist : undefined,
      playlist,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all playlists by user ID
exports.getAllPlaylists = async (req, res) => {
  try {
    const { userId } = req.body;
    if (userId) {
      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: "Invalid userId format" });
      }
      const playlists = await Playlist.find({ "userId._id": userId })
        .populate("userId", "name")
        .populate("sounds");
      if (!playlists.length) {
        return res
          .status(404)
          .json({ message: "No playlists found for this user" });
      }
      return res.status(200).json(playlists);
    } else {
      const playlists = await Playlist.find()
        .populate("userId", "name")
        .populate("sounds");
      return res.status(200).json(playlists);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove (delete) a playlist
exports.removePlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user && req.user._id ? req.user._id : null;
    if (!playlistId || !playlistId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing playlistId" });
    }
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    if (playlist.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not own this playlist" });
    }
    await Playlist.deleteOne({ _id: playlistId });
    return res.status(200).json({ message: "Playlist deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
