const multer = require('multer');
const { AppError } = require('../utils/apiResponse');

const make = (maxMb) => multer({ storage: multer.memoryStorage(), limits: { fileSize: maxMb * 1024 * 1024, files: 1 } }).single('file');

// Turns multer errors into friendly API errors
const handle = (mw, maxMb) => (req, res, next) =>
  mw(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(`File is too large (maximum ${maxMb} MB)`, 413));
    return next(new AppError('Upload failed. Please try again.', 400));
  });

module.exports = {
  imageUpload: handle(make(8), 8),
  videoUpload: handle(make(30), 30),
};
