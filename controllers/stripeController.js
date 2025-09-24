const stripeService = require('../services/stripeService');

/**
 * Controller to get Stripe products
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getProducts = async (req, res) => {
  try {
    const { active, type, limit } = req.query;
    
    const options = {
      active: active !== 'false', // Default to true unless explicitly false
      type: type,
      limit: limit ? parseInt(limit) : 100
    };

    const result = await stripeService.getProducts(options);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      products: result.products,
      hasMore: result.hasMore,
      count: result.products.length
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Controller to get Stripe prices
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getPrices = async (req, res) => {
  try {
    const { active, product, type, currency, limit } = req.query;
    
    const options = {
      active: active !== 'false', // Default to true unless explicitly false
      product: product,
      type: type,
      currency: currency,
      limit: limit ? parseInt(limit) : 100
    };

    const result = await stripeService.getPrices(options);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch prices',
        error: result.error
      });
    }

    // Group prices by product and calculate discounts
    const groupedPrices = {};
    
    result.prices.forEach(price => {
      const productId = price.product.id;
      const productName = price.product.name;
      
      if (!groupedPrices[productId]) {
        groupedPrices[productId] = {
          productId,
          productName,
          recurringPrices: [],
          oneTimePrices: []
        };
      }
      
      if (price.type === 'recurring') {
        groupedPrices[productId].recurringPrices.push(price);
      } else if (price.type === 'one_time') {
        groupedPrices[productId].oneTimePrices.push(price);
      }
    });

    // Get all coupons and promotional codes
    const couponsResult = await stripeService.getCoupons({ limit: 100 });
    const promoCodesResult = await stripeService.getPromoCodes({ limit: 100 });

    console.log(couponsResult, " couponsResult");
    // Process each product group
    const processedPrices = Object.values(groupedPrices).map(productGroup => {
      const recurringPrices = productGroup.recurringPrices;
      const oneTimePrices = productGroup.oneTimePrices;
      
      const planPrices = [];
      
      // Find coupons associated with this product
      const associatedCoupons = [];
      const associatedPromoCodes = [];

      if (couponsResult.success) {
        // Filter coupons that might be associated with this product
        associatedCoupons.push(...couponsResult.coupons.filter(coupon => {
          // Check if coupon metadata contains product info
          const hasMetadataMatch = coupon.metadata && (
            coupon.metadata.productId === productGroup.productId ||
            coupon.metadata.productName === productGroup.productName ||
            coupon.metadata.planType === 'monthly'
          );
          
          // If no metadata match, try to match by coupon name or other criteria
          const hasNameMatch = coupon.name && (
            // Match monthly-related coupons to monthly products
            (productGroup.productName.toLowerCase().includes('monthly') && 
             (coupon.name.toLowerCase().includes('monthly') || 
              coupon.name.toLowerCase().includes('month'))) ||
            // Match general coupons to all products
            coupon.name.toLowerCase().includes('first timer') ||
            coupon.name.toLowerCase().includes('discount')
          );
          
          return hasMetadataMatch || hasNameMatch;
        }));
      }

      if (promoCodesResult.success) {
        // Filter promotional codes that might be associated with this product
        associatedPromoCodes.push(...promoCodesResult.promoCodes.filter(promoCode => {
          // Check if promo code metadata contains product info
          const hasMetadataMatch = promoCode.metadata && (
            promoCode.metadata.productId === productGroup.productId ||
            promoCode.metadata.productName === productGroup.productName ||
            promoCode.metadata.planType === 'monthly'
          );
          
          // If no metadata match, try to match by promo code name or other criteria
          const hasNameMatch = promoCode.code && (
            // Match monthly-related promo codes to monthly products
            (productGroup.productName.toLowerCase().includes('monthly') && 
             (promoCode.code.toLowerCase().includes('monthly') || 
              promoCode.code.toLowerCase().includes('month'))) ||
            // Match general promo codes to all products
            promoCode.code.toLowerCase().includes('first') ||
            promoCode.code.toLowerCase().includes('discount') ||
            promoCode.code.toLowerCase().includes('save')
          );
          
          return hasMetadataMatch || hasNameMatch;
        }));
      }
      
      // Process recurring prices (base prices)
      recurringPrices.forEach(recurringPrice => {
        const basePrice = recurringPrice.unit_amount / 100; // Convert from cents
        const interval = recurringPrice.recurring.interval;
        const planType = interval === 'month' ? 'monthly' : 
                        interval === 'year' ? 'annual' : 
                        interval === 'day' ? 'daily' : interval;
        
        // Calculate available discounts from coupons instead of one-time prices
        const availableDiscounts = associatedCoupons.map(coupon => {
          let savings = 0;
          let discountedPrice = basePrice;
          let discountValue = 0;
          
          if (coupon.percent_off) {
            // Percentage discount
            discountValue = coupon.percent_off;
            savings = (basePrice * coupon.percent_off) / 100;
            discountedPrice = basePrice - savings;
          } else if (coupon.amount_off) {
            // Fixed amount discount
            savings = coupon.amount_off / 100; // Convert from cents
            discountedPrice = basePrice - savings;
            discountValue = Math.round((savings / basePrice) * 100);
          }
          
          return {
            savings: Math.round(savings * 100) / 100, // Round to 2 decimal places
            discountedPrice: Math.round(discountedPrice * 100) / 100,
            discountType: coupon.percent_off ? "percentage" : "fixed_amount",
            discountValue: discountValue,
            priceId: coupon.id, // This is the coupon ID that will be used in payment intent
            couponName: coupon.name,
            valid: coupon.valid,
            timesRedeemed: coupon.times_redeemed,
            maxRedemptions: coupon.max_redemptions
          };
        });
        
        planPrices.push({
          planType: planType,
          basePrice: basePrice,
          basePriceId: recurringPrice.id,
          currency: recurringPrice.currency,
          productId: productGroup.productId,
          productName: productGroup.productName,
          availableDiscounts: availableDiscounts,
          coupons: associatedCoupons,
          promoCodes: associatedPromoCodes,
          // Include original Stripe data
          ...recurringPrice
        });
      });
      
      return planPrices;
    }).flat();

    res.status(200).json({
      message: "Price with available discounts retrieved successfully",
      prices: processedPrices,
      count: processedPrices.length
    });

  } catch (error) {
    console.error('Get prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Controller to get products with their prices
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getProductsWithPrices = async (req, res) => {
  try {
    const { active, type, limit } = req.query;
    
    const options = {
      active: active !== 'false', // Default to true unless explicitly false
      type: type,
      limit: limit ? parseInt(limit) : 100
    };

    const result = await stripeService.getProductsWithPrices(options);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products with prices',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      products: result.products,
      count: result.products.length
    });

  } catch (error) {
    console.error('Get products with prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Controller to sync Stripe products to database
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const syncProducts = async (req, res) => {
  try {
    const result = await stripeService.getProductsWithPrices();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products from Stripe',
        error: result.error
      });
    }

    // Here you would typically sync the products to your database
    // For now, we'll just return the products
    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      products: result.products,
      count: result.products.length
    });

  } catch (error) {
    console.error('Sync products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Controller to validate a coupon code
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const validateCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const validation = await stripeService.validateCouponCode(couponCode);

    res.status(200).json({
      success: true,
      valid: validation.valid,
      coupon: validation.coupon,
      message: validation.valid ? 'Coupon is valid' : 'Invalid coupon code'
    });

  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon',
      error: error.message
    });
  }
};

/**
 * Controller to get all coupons
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getCoupons = async (req, res) => {
  try {
    const { limit, starting_after, ending_before } = req.query;
    
    const options = {
      limit: limit ? parseInt(limit) : 100,
      starting_after: starting_after,
      ending_before: ending_before
    };

    const result = await stripeService.getCoupons(options);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch coupons',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      coupons: result.coupons,
      hasMore: result.hasMore,
      count: result.coupons.length
    });

  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Controller to get all promotional codes
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getPromoCodes = async (req, res) => {
  try {
    const { limit, active, coupon, code } = req.query;
    
    const options = {
      limit: limit ? parseInt(limit) : 100,
      active: active !== undefined ? active === 'true' : undefined,
      coupon: coupon,
      code: code
    };

    const result = await stripeService.getPromoCodes(options);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch promotional codes',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      promoCodes: result.promoCodes,
      hasMore: result.hasMore,
      count: result.promoCodes.length
    });

  } catch (error) {
    console.error('Get promotional codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


module.exports = {
  getProducts,
  getPrices,
  getProductsWithPrices,
  syncProducts,
  validateCoupon,
  getCoupons,
  getPromoCodes
};
