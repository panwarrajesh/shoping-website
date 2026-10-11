const { AppError } = require('../utils/apiResponse');

// Validates + sanitizes req.body. Unknown keys are stripped, so a client can never inject e.g. "role".
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const first = Object.values(fieldErrors).flat()[0] || 'Invalid input';
    return next(new AppError(first, 422, { fieldErrors }));
  }
  req.body = result.data;
  return next();
};

module.exports = { validate };
