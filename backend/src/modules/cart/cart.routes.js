const router = require('express').Router();
const ctrl = require('./cart.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { validateQuery } = require('../../middleware/validateQuery');
const { locationQuery } = require('../products/products.validation');
const v = require('./cart.validation');

const loc = validateQuery(locationQuery); // optional ?lat&lng&pincode&city: marks items the seller cannot deliver there

// Guests: turn a device-side cart into a priced view. Nothing is saved.
router.post('/preview', loc, validate(v.itemsSchema), ctrl.preview);

router.use(authenticate);
router.get('/', loc, ctrl.get);
router.get('/count', ctrl.count);
router.post('/items', loc, validate(v.addSchema), ctrl.add);
router.patch('/items/:itemId', loc, validate(v.qtySchema), ctrl.setQuantity);
router.delete('/items/:itemId', loc, ctrl.remove);
router.delete('/', ctrl.clear);
router.post('/merge', loc, validate(v.itemsSchema), ctrl.merge);

module.exports = router;
