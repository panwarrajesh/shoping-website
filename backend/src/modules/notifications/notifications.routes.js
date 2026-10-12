const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { parsePage, pageMeta } = require('../../utils/pagination');
const { authenticate } = require('../../middleware/auth');
const repo = require('./notifications.repository');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20, 50);
  const [items, total, unread] = await Promise.all([repo.list(req.user.id, skip, limit), repo.count(req.user.id), repo.countUnread(req.user.id)]);
  return success(res, { items, unread, pagination: pageMeta(total, page, limit) });
}));

router.get('/unread-count', asyncHandler(async (req, res) =>
  success(res, { unread: await repo.countUnread(req.user.id) })));

router.post('/read-all', asyncHandler(async (req, res) => {
  await repo.markAllRead(req.user.id);
  return success(res, {}, 'All notifications marked as read');
}));

router.post('/:id/read', asyncHandler(async (req, res) => {
  await repo.markRead(req.params.id, req.user.id);
  return success(res, {}, 'Marked as read');
}));

module.exports = router;
