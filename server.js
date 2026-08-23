require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const connectDB = require("./DB/db");
const { initializeScheduledTasks } = require("./utils/scheduler");
const logger = require("./utils/logger");
const spacesConfig = require("./config/spacesConfig");


// Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./docs/swagger');

const app = express();
const port = process.env.PORT || 8003;
const host = process.env.HOST || '192.168.1.25';

// Validate DigitalOcean Spaces configuration
spacesConfig.validateConfig();

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://192.168.1.25:3000', 'http://192.168.1.25:8003'];

// Request logging middleware - only for errors (should be first)
app.use(logger.logRequest.bind(logger));

// Middleware for CORS and JSON parsing
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

// Import conditional body parsing middleware
const { conditionalBodyParsing, conditionalUrlEncoded } = require("./middleware/index");
app.use("/api/stripe/webhook", require("./router/stripWebhook"));

// Body parsing middleware with conditional skipping
app.use(conditionalBodyParsing);
app.use(conditionalUrlEncoded);

// Ensure upload directories exist
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const soundUploadsDir = path.join(__dirname, "uploads/sounds");
const thumbnailUploadsDir = path.join(__dirname, "uploads/thumbnails");

ensureDirExists(soundUploadsDir);
ensureDirExists(thumbnailUploadsDir);

// Serve static files from the "uploads" directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
connectDB();

// Initialize scheduled tasks
initializeScheduledTasks();

// Swagger UI setup
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ComeAway API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    servers: [
      {
        url: `http://${host}:${port}`,
        description: 'Development Server'
      }
    ]
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerOptions));

// Define a simple route
app.get("/", (req, res) => {
  res.send("Hello Brother!");
});

// API routes
app.use("/api/auth", require("./router/authroute"));
app.use("/api/team", require("./router/teamRoutes"));
app.use("/api/categories", require("./router/catagoryRoutes"));
app.use("/api/sounds", require("./router/soundRoutes"));
app.use("/api/subscription", require("./router/subscriptionRoutes"));
app.use("/api/favorites", require("./router/favoriteSoundRoutes"));
app.use("/api/playlists", require("./router/playlistRoutes"));
app.use("/api/app-ratings", require("./router/appRatingRoutes"));
app.use("/api/badges", require("./router/badgeRoutes"));
app.use("/api/narrators", require("./router/narratorRoutes"));
app.use("/api/payments", require("./router/paymentRoute"));
app.use("/api/stripe", require("./router/stripeRoutes"));
app.use("/api/revenuecat", require("./router/revenueCatWebhook"));
app.use("/api/activation-codes", require("./router/activationCodeRoutes"));
app.use("/api/entitlements", require("./router/entitlementRoutes"));
app.use("/api/emails", require("./router/emailRoutes"));

// Global error handler
app.use((err, req, res, next) => {
  logger.logError(err, req);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    message: "Server error",
    error: isDevelopment ? err.message : "Internal server error",
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { 
    method: req.method, 
    url: req.url 
  });
  res.status(404).json({ 
    message: "Route not found",
    path: req.url 
  });
});

// // Start the server
app.listen(port, host, () => {
  logger.info('Server started successfully', {
    host,
    port,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  console.log(`Server is running on http://${host}:${port}`);
  console.log(`API Documentation available at http://${host}:${port}/api-docs`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});


module.exports = app;
