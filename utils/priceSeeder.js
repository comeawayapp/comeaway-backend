const Price = require("../models/Price");
const Discount = require("../models/Discount");

const seedPrices = async () => {
  try {
    console.log("🌱 Seeding prices...");
    
    // Check if prices already exist
    const existingPrices = await Price.countDocuments();
    if (existingPrices > 0) {
      console.log("✅ Prices already exist, skipping...");
      return;
    }
    
    // Create sample prices
    const prices = [
      {
        planType: 'monthly',
        basePrice: 9.99,
        currency: 'USD',
        description: 'Monthly Pro Plan',
        features: [
          { name: 'Unlimited Access', description: 'Access to all premium sounds', included: true },
          { name: 'High Quality', description: 'Stream in high quality audio', included: true },
          { name: 'Offline Downloads', description: 'Download sounds for offline use', included: true }
        ]
      },
      {
        planType: 'annual',
        basePrice: 99.99,
        currency: 'USD',
        description: 'Annual Pro Plan (Save 17%)',
        features: [
          { name: 'Unlimited Access', description: 'Access to all premium sounds', included: true },
          { name: 'High Quality', description: 'Stream in high quality audio', included: true },
          { name: 'Offline Downloads', description: 'Download sounds for offline use', included: true },
          { name: 'Priority Support', description: 'Get priority customer support', included: true }
        ]
      },
      {
        planType: 'daily',
        basePrice: 0.99,
        currency: 'USD',
        description: 'Daily Pro Plan',
        features: [
          { name: 'Unlimited Access', description: 'Access to all premium sounds for 24 hours', included: true }
        ]
      }
    ];
    
    await Price.insertMany(prices);
    console.log("✅ Prices seeded successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding prices:", error);
  }
};

const seedDiscounts = async () => {
  try {
    console.log("🌱 Seeding discounts...");
    
    // Check if discounts already exist
    const existingDiscounts = await Discount.countDocuments();
    if (existingDiscounts > 0) {
      console.log("✅ Discounts already exist, skipping...");
      return;
    }
    
    // Create sample discounts
    const discounts = [
      {
        name: 'New User Special',
        description: 'Get 20% off your first subscription!',
        discountType: 'percentage',
        discountValue: 20,
        applicablePlans: ['monthly', 'annual'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        usageLimit: 1000,
        couponCode: 'NEWUSER20'
      },
      {
        name: 'Summer Sale',
        description: 'Hot summer deals - 15% off all plans!',
        discountType: 'percentage',
        discountValue: 15,
        applicablePlans: ['all'],
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31'),
        usageLimit: 500,
        couponCode: 'SUMMER15'
      },
      {
        name: 'Annual Saver',
        description: 'Save $20 on annual plans',
        discountType: 'fixed',
        discountValue: 20,
        applicablePlans: ['annual'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        usageLimit: null,
        couponCode: 'ANNUAL20'
      }
    ];
    
    await Discount.insertMany(discounts);
    console.log("✅ Discounts seeded successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding discounts:", error);
  }
};

const runSeeder = async () => {
  try {
    console.log("�� Starting price and discount seeder...");
    
    await seedPrices();
    await seedDiscounts();
    
    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

// Run seeder if called directly
if (require.main === module) {
  runSeeder();
}

module.exports = { seedPrices, seedDiscounts, runSeeder };
