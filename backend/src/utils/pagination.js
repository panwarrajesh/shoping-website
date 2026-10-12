const parsePage = (q = {}, defLimit = 20, max = 50) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(q.limit, 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
};
const pageMeta = (total, page, limit) => ({ total, page, limit, hasMore: page * limit < total });

module.exports = { parsePage, pageMeta };
