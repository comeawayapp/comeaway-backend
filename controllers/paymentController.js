require("dotenv").config(); // Load environment variables
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || ""); // Ensure your Stripe secret key is set in the environment variables

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

module.exports = {
  createPaymentIntent,
};
