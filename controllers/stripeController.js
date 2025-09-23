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

    // Process each product group
    const processedPrices = Object.values(groupedPrices).map(productGroup => {
      const recurringPrices = productGroup.recurringPrices;
      const oneTimePrices = productGroup.oneTimePrices;
      
      const planPrices = [];
      
      // Process recurring prices (base prices)
      recurringPrices.forEach(recurringPrice => {
        const basePrice = recurringPrice.unit_amount / 100; // Convert from cents
        const interval = recurringPrice.recurring.interval;
        const planType = interval === 'month' ? 'monthly' : 
                        interval === 'year' ? 'annual' : 
                        interval === 'day' ? 'daily' : interval;
        
        // Find matching discount prices (one_time prices for this product)
        const availableDiscounts = oneTimePrices.map(discountPrice => {
          const discountedPrice = discountPrice.unit_amount / 100;
          const savings = basePrice - discountedPrice;
          const discountValue = Math.round((savings / basePrice) * 100);
          
          return {
            savings: savings,
            discountedPrice: discountedPrice,
            discountType: "percentage",
            discountValue: discountValue,
            priceId: discountPrice.id
          };
        });
        
        planPrices.push({
          planType: planType,
          basePrice: basePrice,
          basePriceId: recurringPrice.id,
          currency: recurringPrice.currency,
          availableDiscounts: availableDiscounts,
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


module.exports = {
  getProducts,
  getPrices,
  getProductsWithPrices,
  syncProducts
};
