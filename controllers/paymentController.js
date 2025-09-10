require("dotenv").config(); // Load environment variables
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || ""); // Ensure your Stripe secret key is set in the environment variables
const User = require("../models/user");
const Price = require("../models/Price");
const Discount = require("../models/Discount");

/**
 * Controller to create a payment intent
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency, metadata = {} } = req.body;

    // Validate input
    if (!amount || !currency) {
      return res
        .status(400)
        .json({ error: "Amount and currency are required" });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res
        .status(400)
        .json({ error: "Amount must be a positive number" });
    }
    if (typeof currency !== "string" || currency.length !== 3) {
      return res
        .status(400)
        .json({ error: "Currency must be a 3-letter string" });
    }

    // Add user ID to metadata if authenticated user exists
    if (req.user && req.user._id) {
      metadata.userId = req.user._id.toString();
    }

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
    });

    // Send the client secret to the frontend
    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
};

/**
 * Controller to create payment sheet parameters for mobile payments
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createPaymentSheet = async (req, res) => {
  try {
    const { plan, priceId, userId } = req.body; // Get plan and userId from request

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Convert amount to cents
    const price = await Price.findById(priceId);

    if (!price) {
      return res.status(404).json({ error: "Price not found" });
    }

    // Calculate final price with discount if assigned
    let finalPrice = price.basePrice;
    if (price.discountId) {
      const discount = await Discount.findById(price.discountId);
      if (discount && discount.isActive && 
          new Date() >= discount.startDate && 
          new Date() <= discount.endDate) {
        if (discount.discountType === 'percentage') {
          finalPrice = price.basePrice * (1 - discount.discountValue / 100);
        } else {
          finalPrice = Math.max(0, price.basePrice - discount.discountValue);
        }
      }
    }

    const amountInCents = Math.round(finalPrice * 100);

    // Check if user already has a Stripe customer ID
    let customer;
    if (user.stripeCustomerId) {
      // Use existing customer
      try {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
        console.log(`Using existing Stripe customer: ${customer.id}`);
      } catch (error) {
        console.log(`Customer ${user.stripeCustomerId} not found, creating new one`);
        // If customer doesn't exist in Stripe, create a new one
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstname} ${user.lastname}`,
          metadata: {
            userId: userId
          }
        });
        
        // Update user with new customer ID
        await User.findByIdAndUpdate(userId, {
          stripeCustomerId: customer.id
        });
      }
    } else {
      // Create new customer only if one doesn't exist
      customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstname} ${user.lastname}`,
        metadata: {
          userId: userId
        }
      });
      
      // Save the customer ID to user record
      await User.findByIdAndUpdate(userId, {
        stripeCustomerId: customer.id
      });
      console.log(`Created new Stripe customer: ${customer.id}`);
    }

    // Create an ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2025-02-24.acacia" } // Ensure this matches your API version in Stripe dashboard
    );
    console.log(customer.id, ephemeralKey.secret);

    // Prepare metadata
    const metadata = {};
    if (userId) {
      metadata.userId = userId;
    }
    if (plan) {
      metadata.subscriptionPlan = plan;
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      customer: customer.id,
      metadata: metadata,
      // Stripe enables automatic payment methods by default in the latest versions.
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Respond with the required parameters for the payment sheet
    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    });
  } catch (error) {
    console.error("Error creating payment sheet params:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createPaymentIntent,
  createPaymentSheet,
};
