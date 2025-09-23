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

    res.status(200).json({
      success: true,
      prices: result.prices,
      hasMore: result.hasMore,
      count: result.prices.length
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
