const success = (res, data = {}, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });

const failure = (res, message = 'Something went wrong', status = 400, error = {}) =>
  res.status(status).json({ success: false, message, error });

class AppError extends Error {
  constructor(message, status = 400, error = {}) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

module.exports = { success, failure, AppError };
