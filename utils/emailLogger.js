const fs = require("fs").promises;
const path = require("path");

/**
 * Email Logger Utility
 * Logs email activities for monitoring and debugging
 */
class EmailLogger {
  constructor() {
    this.logDir = path.join(__dirname, "../logs");
    this.emailLogFile = path.join(this.logDir, "email.log");
    this.errorLogFile = path.join(this.logDir, "email-errors.log");
    this.setupLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  async setupLogDirectory() {
    try {
      await fs.access(this.logDir);
    } catch (error) {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  /**
   * Format log entry
   * @param {Object} data - Log data
   * @returns {string} - Formatted log entry
   */
  formatLogEntry(data) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${JSON.stringify(data)}\n`;
  }

  /**
   * Log email sent successfully
   * @param {Object} emailData - Email data
   * @param {Object} result - Send result
   */
  async logEmailSent(emailData, result) {
    const logEntry = this.formatLogEntry({
      type: "EMAIL_SENT",
      to: emailData.to,
      subject: emailData.subject,
      attempt: result.attempt,
      messageId: result.data?.id,
      timestamp: new Date().toISOString(),
    });

    try {
      await fs.appendFile(this.emailLogFile, logEntry);
    } catch (error) {
      console.error("Failed to write to email log:", error);
    }
  }

  /**
   * Log email send failure
   * @param {Object} emailData - Email data
   * @param {Object} error - Error details
   */
  async logEmailError(emailData, error) {
    const logEntry = this.formatLogEntry({
      type: "EMAIL_ERROR",
      to: emailData.to,
      subject: emailData.subject,
      error: error.error || error.message,
      attempt: error.attempt,
      timestamp: new Date().toISOString(),
    });

    try {
      await fs.appendFile(this.errorLogFile, logEntry);
    } catch (writeError) {
      console.error("Failed to write to error log:", writeError);
    }
  }

  /**
   * Get email statistics from logs
   * @param {number} hours - Hours to look back (default: 24)
   * @returns {Object} - Email statistics
   */
  async getEmailStats(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const stats = {
        sent: 0,
        failed: 0,
        totalAttempts: 0,
        retries: 0,
      };

      // Read and parse log files
      try {
        const emailLogData = await fs.readFile(this.emailLogFile, "utf8");
        const errorLogData = await fs.readFile(this.errorLogFile, "utf8");

        // Parse sent emails
        emailLogData.split("\n").forEach((line) => {
          if (line.trim()) {
            try {
              const logEntry = JSON.parse(line.split("] ")[1]);
              const logTime = new Date(logEntry.timestamp);
              if (logTime >= cutoffTime) {
                stats.sent++;
                stats.totalAttempts++;
                if (logEntry.attempt > 1) {
                  stats.retries++;
                }
              }
            } catch (parseError) {
              // Skip invalid log entries
            }
          }
        });

        // Parse failed emails
        errorLogData.split("\n").forEach((line) => {
          if (line.trim()) {
            try {
              const logEntry = JSON.parse(line.split("] ")[1]);
              const logTime = new Date(logEntry.timestamp);
              if (logTime >= cutoffTime) {
                stats.failed++;
                stats.totalAttempts++;
              }
            } catch (parseError) {
              // Skip invalid log entries
            }
          }
        });
      } catch (readError) {
        // Log files might not exist yet
      }

      return {
        ...stats,
        successRate:
          stats.totalAttempts > 0 ?
            ((stats.sent / stats.totalAttempts) * 100).toFixed(2)
          : 0,
        retryRate:
          stats.sent > 0 ? ((stats.retries / stats.sent) * 100).toFixed(2) : 0,
      };
    } catch (error) {
      console.error("Error getting email stats:", error);
      return {
        sent: 0,
        failed: 0,
        totalAttempts: 0,
        retries: 0,
        successRate: 0,
        retryRate: 0,
      };
    }
  }

  /**
   * Clean old log entries
   * @param {number} days - Days to keep (default: 30)
   */
  async cleanOldLogs(days = 30) {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      for (const logFile of [this.emailLogFile, this.errorLogFile]) {
        try {
          const logData = await fs.readFile(logFile, "utf8");
          const filteredLines = logData.split("\n").filter((line) => {
            if (!line.trim()) return false;
            try {
              const logEntry = JSON.parse(line.split("] ")[1]);
              return new Date(logEntry.timestamp) >= cutoffTime;
            } catch (parseError) {
              return false; // Remove invalid entries
            }
          });

          await fs.writeFile(logFile, filteredLines.join("\n") + "\n");
        } catch (fileError) {
          // File might not exist
        }
      }
    } catch (error) {
      console.error("Error cleaning old logs:", error);
    }
  }
}

// Export singleton instance
const emailLogger = new EmailLogger();
module.exports = emailLogger;
