const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('./payments.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { failure } = require('../../utils/apiResponse');
const v = require('./payments.validation');

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => failure(res, 'Bahut zyada payment attempts. Thodi der baad try karo.', 429),
});

router.get('/config', ctrl.config);
router.post('/webhook', ctrl.webhook); // public on purpose: protected by the Razorpay signature, not a login

router.use(authenticate);
router.post('/create', limiter, validate(v.createSchema), ctrl.create);
router.post('/verify', limiter, validate(v.verifySchema), ctrl.verify);

module.exports = router;
