/**
 * File extension constants for better maintainability
 */

// Supported audio file extensions
const AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav', 
  '.m4a',
  '.aac',
  '.flac',
  '.ogg',
  '.wma',
  '.aiff'
];

// Supported image file extensions
const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.svg',
  '.tiff'
];

// Supported video file extensions
const VIDEO_EXTENSIONS = [
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.mkv'
];

/**
 * Check if a file extension is an audio file
 * @param {string} extension - File extension (e.g., '.mp3')
 * @returns {boolean} - True if audio file
 */
const isAudioFile = (extension) => {
  return AUDIO_EXTENSIONS.includes(extension.toLowerCase());
};

/**
 * Check if a file extension is an image file
 * @param {string} extension - File extension (e.g., '.jpg')
 * @returns {boolean} - True if image file
 */
const isImageFile = (extension) => {
  return IMAGE_EXTENSIONS.includes(extension.toLowerCase());
};

/**
 * Check if a file extension is a video file
 * @param {string} extension - File extension (e.g., '.mp4')
 * @returns {boolean} - True if video file
 */
const isVideoFile = (extension) => {
  return VIDEO_EXTENSIONS.includes(extension.toLowerCase());
};

/**
 * Get the appropriate folder name for a file type
 * @param {string} extension - File extension
 * @returns {string} - Folder name ('sounds', 'thumbnails', 'videos', or 'uploads')
 */
const getFolderForExtension = (extension) => {
  if (isAudioFile(extension)) return 'sounds';
  if (isImageFile(extension)) return 'thumbnails';
  if (isVideoFile(extension)) return 'videos';
  return 'uploads'; // Default folder for unknown types
};

module.exports = {
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  isAudioFile,
  isImageFile,
  isVideoFile,
  getFolderForExtension
};
