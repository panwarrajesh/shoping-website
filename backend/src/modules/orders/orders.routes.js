const router = require('express').Router();
const ctrl = require('./orders.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireSeller, requireApprovedSeller } = require('../../middleware/seller');
const { validate } = require('../../middleware/validate');
const { validateQuery } = require('../../middleware/validateQuery');
const rateLimit = require('express-rate-limit');
const { failure } = require('../../utils/apiResponse');
const v = require('./orders.validation');

const placeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => failure(res, 'Bahut zyada orders try ho rahe hain. Thodi der baad try karo.', 429),
});
const seller = [authorize('SELLER'), requireSeller];

router.use(authenticate);

// ----- seller (declared first so '/seller/...' is never read as an order id) -----
router.get('/seller', ...seller, validateQuery(v.listQuery), ctrl.listSeller);
router.get('/seller/:id', ...seller, ctrl.getSeller);
router.post('/seller/:id/status', ...seller, requireApprovedSeller, validate(v.statusSchema), ctrl.setStatus);
router.post('/seller/:id/cancel', ...seller, validate(v.cancelSchema), ctrl.cancelSeller);

// ----- customer -----
router.get('/quote', validateQuery(v.quoteQuery), ctrl.quote);
router.post('/', placeLimiter, validate(v.placeSchema), ctrl.place);
router.get('/', validateQuery(v.listQuery), ctrl.listMine);
router.get('/:id', ctrl.getMine);
router.post('/:id/cancel', validate(v.cancelSchema), ctrl.cancelMine);

module.exports = router;
