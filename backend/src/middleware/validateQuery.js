const { AppError } = require('../utils/apiResponse');

const validateQuery = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.query);
  if (!r.success) return next(new AppError(Object.values(r.error.flatten().fieldErrors).flat()[0] || 'Invalid query', 422));
  req.query = r.data;
  return next();
};

module.exports = { validateQuery };
