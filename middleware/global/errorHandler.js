import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message).join(', ');
    error = new AppError(messages, 400, 'VALIDATION_ERROR');
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'CAST_ERROR');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    error = new AppError(`Duplicate value for: ${field}`, 409, 'DUPLICATE_KEY');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Body parser error
  if (err.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON in request body', 400, 'INVALID_JSON');
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large', 413, 'FILE_TOO_LARGE');
  }

  // Multer unexpected file
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Unexpected file field', 400, 'UPLOAD_ERROR');
  }

  // Multer too many files
  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new AppError('Too many files', 400, 'UPLOAD_ERROR');
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Something went wrong';
  const errorCode = error.errorCode || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, {
      stack: err.stack,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user?._id,
    });
  }

  const response = {
    success: false,
    message,
    errorCode,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

export default errorHandler;