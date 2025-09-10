const express = require('express');
const { createPaymentIntent, createPaymentSheet } = require('../controllers/paymentController');

const router = express.Router();

// Route to create a payment intent
router.post('/create-payment-intent', createPaymentIntent);

// Route to create payment sheet parameters
router.post('/payment-sheet', createPaymentSheet);

module.exports = router;