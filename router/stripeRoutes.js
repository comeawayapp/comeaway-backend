const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

router.get('/products', stripeController.getProducts);
router.get('/prices', stripeController.getPrices);
router.get('/products-with-prices', stripeController.getProductsWithPrices);
router.post('/sync-products', stripeController.syncProducts);


module.exports = router;
