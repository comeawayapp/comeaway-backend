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
        },
        // Stripe-specific schemas
        CheckoutSession: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Stripe checkout session ID'
            },
            url: {
              type: 'string',
              description: 'Checkout URL for redirect'
            },
            success: {
              type: 'boolean',
              description: 'Session creation success status'
            }
          }
        },
        PaymentSheet: {
          type: 'object',
          properties: {
            paymentIntent: {
              type: 'string',
              description: 'Payment intent client secret'
            },
            ephemeralKey: {
              type: 'string',
              description: 'Ephemeral key for mobile payments'
            },
            customer: {
              type: 'string',
              description: 'Stripe customer ID'
            },
            publishableKey: {
              type: 'string',
              description: 'Stripe publishable key'
            }
          }
        },
        Subscription: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Subscription ID'
            },
            stripeSubscriptionId: {
              type: 'string',
              description: 'Stripe subscription ID'
            },
            status: {
              type: 'string',
              enum: ['active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'trialing'],
              description: 'Subscription status'
            },
            currentPeriodStart: {
              type: 'string',
              format: 'date-time',
              description: 'Current period start date'
            },
            currentPeriodEnd: {
              type: 'string',
              format: 'date-time',
              description: 'Current period end date'
            },
            cancelAtPeriodEnd: {
              type: 'boolean',
              description: 'Whether subscription cancels at period end'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether subscription is active'
            },
            isInTrial: {
              type: 'boolean',
              description: 'Whether subscription is in trial'
            },
            daysUntilRenewal: {
              type: 'number',
              description: 'Days until next renewal'
            }
          }
        },
        Discount: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Discount ID'
            },
            name: {
              type: 'string',
              description: 'Discount name'
            },
            description: {
              type: 'string',
              description: 'Discount description'
            },
            discountType: {
              type: 'string',
              enum: ['percentage', 'fixed'],
              description: 'Type of discount'
            },
            discountValue: {
              type: 'number',
              description: 'Discount value'
            },
            couponCode: {
              type: 'string',
              description: 'Coupon code'
            },
            promoCode: {
              type: 'string',
              description: 'Promotional code'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether discount is active'
            },
            usageLimit: {
              type: 'number',
              description: 'Maximum usage limit'
            },
            usedCount: {
              type: 'number',
              description: 'Current usage count'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Discount start date'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Discount end date'
            },
            stripeCouponId: {
              type: 'string',
              description: 'Stripe coupon ID'
            },
            stripePromoCodeId: {
              type: 'string',
              description: 'Stripe promotional code ID'
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