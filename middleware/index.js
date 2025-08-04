const logger = require("../utils/logger");
const checkProStatus = require("./checkProStatus");

// Middleware to skip body parsing for file upload routes
const skipBodyParsing = (req, res, next) => {
  // Set a flag to indicate this route should skip body parsing
  req.skipBodyParsing = true;
  next();
};

// Middleware to handle body parsing with conditional skipping
const conditionalBodyParsing = (req, res, next) => {
  // If the route has been marked to skip body parsing, skip it
  if (req.skipBodyParsing) {
    return next();
  }

  // Otherwise, parse the body normally
  const express = require('express');
  express.json({ limit: "50mb" })(req, res, (err) => {
    if (err) {
      logger.error('JSON parsing error', { 
        error: err.message, 
        path: req.path,
        contentType: req.headers['content-type'],
        body: req.body 
      });
      return res.status(400).json({ 
        message: "Invalid JSON format", 
        error: err.message 
      });
    }
    next();
  });
};

// Middleware to handle URL encoding with conditional skipping
const conditionalUrlEncoded = (req, res, next) => {
  // If the route has been marked to skip body parsing, skip it
  if (req.skipBodyParsing) {
    return next();
  }

  // Otherwise, parse URL encoded data normally
  const express = require('express');
  express.urlencoded({ limit: "50mb", extended: true })(req, res, (err) => {
    if (err) {
      logger.error('URL encoding parsing error', { 
        error: err.message, 
        path: req.path 
      });
      return res.status(400).json({ 
        message: "Invalid form data", 
        error: err.message 
      });
    }
    next();
  });
};

module.exports = {
  skipBodyParsing,
  conditionalBodyParsing,
  conditionalUrlEncoded,
  checkProStatus
};
