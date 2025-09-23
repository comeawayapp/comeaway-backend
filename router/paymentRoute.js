const express = require('express');
const { createCheckoutSession, createPaymentSheet, getPaymentStatus, getPaymentHistory } = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Route to create checkout session for subscriptions
router.post('/create-checkout-session', authMiddleware, createCheckoutSession);

// Route to create payment sheet parameters for mobile
router.post('/payment-sheet', createPaymentSheet);

// Route to get payment status
router.get('/status/:paymentIntentId', authMiddleware, getPaymentStatus);

// Route to get user payment history
router.get('/history', authMiddleware, getPaymentHistory);

module.exports = router;