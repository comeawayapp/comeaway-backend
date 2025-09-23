const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const StripeProduct = require('../models/StripeProduct');

async function setupStripeProducts() {
  try {
    console.log('🚀 Setting up Stripe Products and Prices...');

    // 1. Create Monthly Subscription Product
    const monthlyProduct = await stripe.products.create({
      name: 'ComeAway Monthly Pro',
      description: 'Monthly subscription to ComeAway Pro features',
      type: 'service',
      metadata: {
        planType: 'monthly',
        features: 'unlimited_sounds,premium_narrators,ad_free'
      }
    });

    const monthlyPrice = await stripe.prices.create({
      product: monthlyProduct.id,
      unit_amount: 999, // $9.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      metadata: {
        planType: 'monthly'
      }
    });

    // 2. Create Annual Subscription Product
    const annualProduct = await stripe.products.create({
      name: 'ComeAway Annual Pro',
      description: 'Annual subscription to ComeAway Pro features',
      type: 'service',
      metadata: {
        planType: 'annual',
        features: 'unlimited_sounds,premium_narrators,ad_free'
      }
    });

    const annualPrice = await stripe.prices.create({
      product: annualProduct.id,
      unit_amount: 9999, // $99.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
        interval_count: 1
      },
      metadata: {
        planType: 'annual'
      }
    });

    // 3. Create Daily Subscription Product
    const dailyProduct = await stripe.products.create({
      name: 'ComeAway Daily Pro',
      description: 'Daily subscription to ComeAway Pro features',
      type: 'service',
      metadata: {
        planType: 'daily',
        features: 'unlimited_sounds,premium_narrators,ad_free'
      }
    });

    const dailyPrice = await stripe.prices.create({
      product: dailyProduct.id,
      unit_amount: 99, // $0.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'day',
        interval_count: 1
      },
      metadata: {
        planType: 'daily'
      }
    });

    // 4. Save to database
    await StripeProduct.create({
      stripeProductId: monthlyProduct.id,
      name: monthlyProduct.name,
      description: monthlyProduct.description,
      type: monthlyProduct.type,
      isActive: true,
      features: [
        { name: 'Unlimited Sounds', description: 'Access to all premium sounds', included: true },
        { name: 'Premium Narrators', description: 'Access to all narrator voices', included: true },
        { name: 'Ad-Free Experience', description: 'No advertisements', included: true }
      ],
      legacyPlanType: 'monthly'
    });

    await StripeProduct.create({
      stripeProductId: annualProduct.id,
      name: annualProduct.name,
      description: annualProduct.description,
      type: annualProduct.type,
      isActive: true,
      features: [
        { name: 'Unlimited Sounds', description: 'Access to all premium sounds', included: true },
        { name: 'Premium Narrators', description: 'Access to all narrator voices', included: true },
        { name: 'Ad-Free Experience', description: 'No advertisements', included: true }
      ],
      legacyPlanType: 'annual'
    });

    await StripeProduct.create({
      stripeProductId: dailyProduct.id,
      name: dailyProduct.name,
      description: dailyProduct.description,
      type: dailyProduct.type,
      isActive: true,
      features: [
        { name: 'Unlimited Sounds', description: 'Access to all premium sounds', included: true },
        { name: 'Premium Narrators', description: 'Access to all narrator voices', included: true },
        { name: 'Ad-Free Experience', description: 'No advertisements', included: true }
      ],
      legacyPlanType: 'daily'
    });

    // 5. Prices are now managed directly in Stripe
    console.log('✅ Prices created in Stripe:');
    console.log(`- Monthly: ${monthlyPrice.id} ($9.99/month)`);
    console.log(`- Annual: ${annualPrice.id} ($99.99/year)`);
    console.log(`- Daily: ${dailyPrice.id} ($0.99/day)`);

    console.log('✅ Stripe Products and Prices created successfully!');

    return {
      monthly: { productId: monthlyProduct.id, priceId: monthlyPrice.id },
      annual: { productId: annualProduct.id, priceId: annualPrice.id },
      daily: { productId: dailyProduct.id, priceId: dailyPrice.id }
    };

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  const connectDB = require('../DB/db');
  
  connectDB().then(async () => {
    await setupStripeProducts();
    process.exit(0);
  }).catch(error => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });
}

module.exports = setupStripeProducts;
