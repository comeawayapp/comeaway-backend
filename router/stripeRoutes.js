const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

router.get('/products', stripeController.getProducts);
router.get('/prices/plan/monthly/with-available-discounts', stripeController.getPrices);
router.get('/products-with-prices', stripeController.getProductsWithPrices);
router.post('/sync-products', stripeController.syncProducts);
router.post('/validate-coupon', stripeController.validateCoupon);
router.get('/coupons', stripeController.getCoupons);
router.get('/promo-codes', stripeController.getPromoCodes);


module.exports = router;
