const router = require('express').Router();
const ctrl = require('./products.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireSeller, requireApprovedSeller } = require('../../middleware/seller');
const { validate } = require('../../middleware/validate');
const { validateQuery } = require('../../middleware/validateQuery');
const v = require('./products.validation');

const seller = [authenticate, authorize('SELLER'), requireSeller];

// ----- public -----
router.get('/home', validateQuery(v.locationQuery), ctrl.home);
router.get('/', validateQuery(v.listQueryLoc), ctrl.search);

// ----- seller (must be declared before '/:id') -----
router.get('/mine', ...seller, validateQuery(v.mineQuery), ctrl.mine);
router.get('/mine/inventory', ...seller, validateQuery(v.mineQuery), ctrl.inventory);
router.get('/mine/:id', ...seller, ctrl.mineOne);
router.post('/', ...seller, requireApprovedSeller, validate(v.productSchema), ctrl.create);
router.put('/variants/:variantId/stock', ...seller, requireApprovedSeller, validate(v.stockSchema), ctrl.setStock);
router.put('/:id', ...seller, requireApprovedSeller, validate(v.productSchema), ctrl.update);
router.delete('/:id', ...seller, ctrl.remove);

// ----- public detail (by id or slug) -----
router.get('/:id', validateQuery(v.locationQuery), ctrl.detail);

module.exports = router;
