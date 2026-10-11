const { failure } = require('../utils/apiResponse');

const notFound = (req, res) => failure(res, 'Route not found', 404);

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return failure(res, 'Invalid request body', 400);
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
    // Never leak internals or stack traces to customers
    return failure(res, 'Something went wrong. Please try again.', 500, {});
  }
  // 4xx errors are intentional AppErrors: safe to send message + structured details (field errors, codes)
  return failure(res, err.message, status, err.error || {});
};

module.exports = { notFound, errorHandler };
