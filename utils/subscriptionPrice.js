const Payment = require("../models/Payment");

/**
 * Stripe Price IDs look like price_...
 * RevenueCat / legacy product ids usually do not.
 */
function looksLikeStripePriceId(priceId) {
  return typeof priceId === "string" && /^price_/.test(priceId);
}

/**
 * Best-effort price for a Subscription:
 * 1) Latest successful Payment.amount (cents)
 * 2) Live Stripe price for stripePriceId
 * 3) null
 *
 * @param {object} subscription - Subscription document
 * @param {object} [options]
 * @param {Function} [options.retrieveStripePrice] - injectable for tests
 * @returns {Promise<{ price: number|null, price_cents: number|null, currency: string|null }>}
 */
async function resolveSubscriptionPrice(subscription, options = {}) {
  if (!subscription) {
    return { price: null, price_cents: null, currency: null };
  }

  const payment = await Payment.findOne({
    subscriptionId: subscription._id,
    status: "succeeded",
  }).sort({ createdAt: -1 });

  if (payment && typeof payment.amount === "number") {
    return {
      price: payment.amount / 100,
      price_cents: payment.amount,
      currency: (payment.currency || "usd").toLowerCase(),
    };
  }

  const priceId = subscription.stripePriceId;
  if (!looksLikeStripePriceId(priceId)) {
    return { price: null, price_cents: null, currency: null };
  }

  try {
    const retrieve =
      options.retrieveStripePrice ||
      (async (id) => {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        return stripe.prices.retrieve(id);
      });
    const stripePrice = await retrieve(priceId);
    if (stripePrice && typeof stripePrice.unit_amount === "number") {
      return {
        price: stripePrice.unit_amount / 100,
        price_cents: stripePrice.unit_amount,
        currency: (stripePrice.currency || "usd").toLowerCase(),
      };
    }
  } catch (_) {
    // Stripe unavailable or invalid id — fall through to null
  }

  return { price: null, price_cents: null, currency: null };
}

module.exports = {
  looksLikeStripePriceId,
  resolveSubscriptionPrice,
};
