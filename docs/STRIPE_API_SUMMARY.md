# Stripe API Documentation Summary

This document provides a comprehensive overview of all Stripe-related endpoints and webhooks that have been added to your Swagger documentation.

## 📋 Overview

Your Swagger documentation now includes a dedicated **Stripe** section with four main categories:
- **Stripe Payments** - Payment processing and management
- **Stripe Subscriptions** - Subscription lifecycle management  
- **Stripe Discounts** - Coupons and promotional codes
- **Stripe Webhooks** - Real-time event handling

## 🔗 API Endpoints

### 💳 Stripe Payments (4 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/payments/create-checkout-session` | Create checkout session for subscriptions | ✅ |
| `POST` | `/api/payments/create-payment-sheet` | Create payment sheet for mobile payments | ✅ |
| `GET` | `/api/payments/status/{paymentIntentId}` | Get payment status | ✅ |
| `GET` | `/api/payments/history` | Get user payment history | ✅ |

### 🔄 Stripe Subscriptions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/subscription/create` | Create new subscription | ✅ |
| `GET` | `/api/subscription/my` | Get current user's subscription | ✅ |
| `DELETE` | `/api/subscription/{id}/cancel` | Cancel subscription | ✅ |
| `GET` | `/api/subscription/user/{userId}` | Get user's subscription history | ✅ |
| `GET` | `/api/subscription/all` | Get all subscriptions (Admin) | ✅ |

### 🎟️ Stripe Discounts

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/discount/create` | Create new discount | ✅ |
| `POST` | `/api/discount/validate-coupon` | Validate coupon code | ❌ |
| `POST` | `/api/discount/validate-promo-code` | Validate promotional code | ❌ |
| `GET` | `/api/discount/stats/{id}` | Get discount statistics | ✅ |
| `GET` | `/api/discount/all` | Get all discounts | ✅ |
| `GET` | `/api/discount/active` | Get active discounts | ❌ |
| `GET` | `/api/discount/{id}` | Get discount by ID | ✅ |
| `PUT` | `/api/discount/{id}` | Update discount | ✅ |
| `DELETE` | `/api/discount/{id}` | Delete discount | ✅ |

### 🔔 Stripe Webhooks

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/stripe/webhook` | Stripe webhook endpoint | ❌ |

## 📊 Data Models

### Core Stripe Models

- **CheckoutSession** - Checkout session information
- **PaymentSheet** - Mobile payment parameters
- **PaymentStatus** - Payment status details
- **PaymentHistory** - Paginated payment history
- **Payment** - Individual payment record

### Subscription Models

- **Subscription** - Subscription details with Stripe integration
- **SubscriptionStatus** - Real-time subscription status

### Discount Models

- **Discount** - Discount configuration
- **CouponValidation** - Coupon validation response
- **PromoCodeValidation** - Promotional code validation
- **DiscountStats** - Usage statistics and analytics

### Webhook Models

- **WebhookEvent** - Stripe webhook event structure

## 🎯 Key Features Documented

### Payment Processing
- ✅ One-time payment intents
- ✅ Subscription checkout sessions
- ✅ Mobile payment sheet integration
- ✅ Real-time payment status tracking
- ✅ Payment history with pagination
- ✅ Automatic customer creation

### Subscription Management
- ✅ Create subscriptions with discounts
- ✅ Trial period support
- ✅ Flexible cancellation (immediate or end of period)
- ✅ Real-time status updates
- ✅ Subscription history tracking
- ✅ Admin subscription management

### Discount System
- ✅ Create Stripe coupons and promo codes
- ✅ Real-time validation
- ✅ Usage analytics and statistics
- ✅ Campaign management
- ✅ Public/private discount control
- ✅ Multiple discount types (percentage/fixed)

### Webhook Integration
- ✅ Real-time event processing
- ✅ Automatic database synchronization
- ✅ Comprehensive error handling
- ✅ Event logging and monitoring

## 🔧 Configuration

### Environment Variables Required
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://yourapp.com
```

### Webhook Events Handled
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

## 📱 Frontend Integration Examples

### Web Checkout
```javascript
// Create checkout session
const response = await fetch('/api/payments/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_1234567890',
    couponCode: 'SAVE20'
  })
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe Checkout
```

### Mobile Payment Sheet
```javascript
// Create payment sheet
const response = await fetch('/api/payments/create-payment-sheet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_1234567890',
    userId: 'user_id'
  })
});

const { paymentIntent, ephemeralKey, customer } = await response.json();
// Use with Stripe React Native SDK
```

### Subscription Management
```javascript
// Create subscription
const response = await fetch('/api/subscription/create', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    priceId: 'price_1234567890',
    trialPeriodDays: 7
  })
});

const { clientSecret } = await response.json();
// Use clientSecret for payment confirmation
```

## 🚀 Getting Started

1. **Access Swagger UI**: Navigate to `/api-docs` in your browser
2. **Find Stripe Section**: Look for the "Stripe" tags in the API documentation
3. **Test Endpoints**: Use the "Try it out" feature to test endpoints
4. **View Schemas**: Check the "Schemas" section for data models
5. **Copy Examples**: Use the provided request/response examples

## 📝 Notes

- All endpoints include comprehensive request/response examples
- Error responses are documented with proper HTTP status codes
- Authentication requirements are clearly marked
- Request validation is documented for all required fields
- Response schemas include all possible fields and types

## 🔍 Testing

Use the Swagger UI to:
- Test all endpoints with sample data
- Validate request/response schemas
- View detailed error messages
- Copy cURL commands for testing
- Download OpenAPI specification

Your Stripe integration is now fully documented and ready for development and testing!
