const router = require('express').Router();
const ctrl = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const trustedOrigin = require('../../middleware/trustedOrigin');
const { authLimiter, otpLimiter } = require('../../middleware/rateLimiters');
const v = require('./auth.validation');

router.post('/register', authLimiter, validate(v.registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(v.loginSchema), ctrl.login);
router.post('/otp/send', otpLimiter, validate(v.otpSendSchema), ctrl.sendOtp);
router.post('/otp/verify', authLimiter, validate(v.otpVerifySchema), ctrl.verifyOtp);
router.post('/reset-password', authLimiter, validate(v.resetSchema), ctrl.resetPassword);
router.post('/refresh', trustedOrigin, ctrl.refresh);
router.post('/logout', trustedOrigin, ctrl.logout);
router.post('/logout-all', authenticate, ctrl.logoutAll);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
