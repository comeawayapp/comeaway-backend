const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger utility class
class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
  }

  // Write to both console and file
  write(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data || null
    };

    // Console output
    const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (data) {
      console.log(consoleMessage, data);
    } else {
      console.log(consoleMessage);
    }

    // File output
    const fileMessage = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.logFile, fileMessage);
  }

  info(message, data = null) {
    this.write('INFO', message, data);
  }

  error(message, data = null) {
    this.write('ERROR', message, data);
  }

  warn(message, data = null) {
    this.write('WARN', message, data);
  }

  debug(message, data = null) {
    this.write('DEBUG', message, data);
  }

  // Request logging - only for errors
  logRequest(req, res, next) {
    const start = Date.now();
    
    // Override res.end to log only errors
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const duration = Date.now() - start;
      
      // Only log if there's an error (4xx or 5xx status)
      if (res.statusCode >= 400) {
        logger.error('Request Error', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          headers: {
            'content-type': req.headers['content-type'],
            'authorization': req.headers.authorization ? 'Bearer ***' : 'None'
          },
          body: req.method !== 'GET' ? req.body : null,
          files: req.files ? Object.keys(req.files) : null
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  }

  // Error logging
  logError(error, req = null) {
    this.error('Application Error', {
      message: error.message,
      stack: error.stack,
      request: req ? {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        files: req.files ? Object.keys(req.files) : null
      } : null
    });
  }
}

const logger = new Logger();
module.exports = logger; 