const router = require('express').Router();
const ctrl = require('./sellers.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireSeller } = require('../../middleware/seller');
const { validate } = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimiters');
const v = require('./sellers.validation');

router.get('/public/:slug', ctrl.publicProfile);
router.post('/register', authenticate, authLimiter, validate(v.registerSchema), ctrl.register);

// Everything below: logged in, role SELLER (from DB), and a seller profile must exist
router.use(authenticate, authorize('SELLER'), requireSeller);

router.get('/me', ctrl.me);
router.patch('/me', validate(v.updateProfileSchema), ctrl.updateProfile);
router.put('/me/delivery', validate(v.deliverySchema), ctrl.updateDelivery);
router.put('/me/payout', authLimiter, validate(v.payoutSchema), ctrl.updatePayout);
router.put('/me/kyc', validate(v.kycSchema), ctrl.resubmitKyc);
router.get('/me/dashboard', ctrl.dashboard);

module.exports = router;
