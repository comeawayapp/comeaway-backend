const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

// Get environment variables with fallbacks
const PORT = process.env.PORT || 8003;
const HOST = process.env.HOST || '192.168.1.25';
const NODE_ENV = process.env.NODE_ENV || 'development';
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://your-production-domain.com';

// Swagger configuration
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ComeAway API Documentation',
      version: '1.0.0',
      description: 'API documentation for ComeAway audio streaming platform',
      contact: {
        name: 'ComeAway Support',
        email: 'support@comeaway.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://${HOST}:${PORT}`,
        description: `${NODE_ENV === 'production' ? 'Production' : 'Development'} server`
      },
      {
        url: PRODUCTION_URL,
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Detailed error information'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './docs/*.docs.js' // Path to the API docs
  ]
};

// Generate Swagger specs
const specs = swaggerJsdoc(options);

module.exports = specs; 