const router = require('express').Router();
const ctrl = require('./customers.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimiters');
const v = require('./customers.validation');

router.use(authenticate); // everything here needs a logged-in user, and only ever touches req.user's data

router.get('/me', ctrl.getMe);
router.patch('/me', validate(v.profileSchema), ctrl.updateProfile);
router.post('/me/change-password', authLimiter, validate(v.changePasswordSchema), ctrl.changePassword);

router.get('/me/addresses', ctrl.listAddresses);
router.post('/me/addresses', validate(v.addressCreateSchema), ctrl.createAddress);
router.patch('/me/addresses/:id', validate(v.addressUpdateSchema), ctrl.updateAddress);
router.post('/me/addresses/:id/default', ctrl.setDefaultAddress);
router.delete('/me/addresses/:id', ctrl.deleteAddress);

router.get('/me/wishlist', ctrl.getWishlist);
router.get('/me/wishlist/ids', ctrl.getWishlistIds);
router.put('/me/wishlist/:productId', ctrl.addToWishlist);
router.delete('/me/wishlist/:productId', ctrl.removeFromWishlist);

module.exports = router;
