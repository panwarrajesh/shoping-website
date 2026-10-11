const router = require('express').Router();
const { success } = require('../utils/apiResponse');

router.get('/health', (req, res) => success(res, { uptime: process.uptime() }, 'LocalMart API is running'));

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/categories', require('../modules/categories/categories.routes'));
router.use('/customers', require('../modules/customers/customers.routes'));
router.use('/notifications', require('../modules/notifications/notifications.routes'));
router.use('/sellers', require('../modules/sellers/sellers.routes'));
router.use('/products', require('../modules/products/products.routes'));
router.use('/locations', require('../modules/locations/locations.routes'));
router.use('/uploads', require('../modules/uploads/uploads.routes'));
// More modules get mounted here in later steps.

module.exports = router;
