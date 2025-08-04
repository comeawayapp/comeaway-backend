const fs = require("fs").promises;
const path = require("path");

// Ensure logs directory exists
const ensureLogsDirectory = async () => {
  const logsDir = path.join(__dirname, "../logs");
  try {
    await fs.access(logsDir);
  } catch (error) {
    await fs.mkdir(logsDir, { recursive: true });
  }
};

// Log profile update attempts
const logProfileUpdate = async (
  userId,
  email,
  action,
  success = true,
  details = ""
) => {
  try {
    await ensureLogsDirectory();

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      email,
      action,
      success,
      details,
      ip: "N/A", // Could be enhanced to include IP address
    };

    const logLine = JSON.stringify(logEntry) + "\n";
    const logFile = path.join(__dirname, "../logs/profile-updates.log");

    await fs.appendFile(logFile, logLine);
  } catch (error) {
    console.error("Failed to log profile update:", error);
  }
};

module.exports = {
  logProfileUpdate,
};
