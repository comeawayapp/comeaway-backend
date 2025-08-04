require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");

// Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./docs/swagger');

const app = express();
const port = 5001; // Use different port

// Middleware for CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ComeAway API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  }
}));

// Define a simple route
app.get("/", (req, res) => {
  res.send("ComeAway API Server - Swagger Documentation Test");
});

// Test API routes (without database)
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!", timestamp: new Date().toISOString() });
});

// Start the server
app.listen(port, () => {
  console.log(`Test server is running on http://localhost:${port}`);
  console.log(`API Documentation available at http://localhost:${port}/api-docs`);
});

module.exports = app; 