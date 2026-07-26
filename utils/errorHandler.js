import logger from './logger.js';

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleMongooseError = (err) => {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message).join(', ');
    return new AppError(messages, 400, 'VALIDATION_ERROR');
  }

  if (err.name === 'CastError') {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'CAST_ERROR');
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    return new AppError(`Duplicate value for: ${field}`, 409, 'DUPLICATE_KEY');
  }

  return new AppError('Database error', 500, 'DB_ERROR');
};

const handleJWTError = (err) => {
  if (err.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }
  return new AppError('Invalid token', 401, 'INVALID_TOKEN');
};

const globalErrorHandler = (err, req, res, next) => {
  let error = err;

  // Handle known error types
  if (err.name === 'ValidationError' || err.name === 'CastError' || err.code === 11000) {
    error = handleMongooseError(err);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }

  if (err.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON', 400, 'INVALID_JSON');
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large', 413, 'FILE_TOO_LARGE');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Too many files or wrong field name', 400, 'UPLOAD_ERROR');
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Something went wrong';
  const errorCode = error.errorCode || 'INTERNAL_ERROR';

  // Log server errors
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
    });
  }

  // Dev mode includes stack
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

export { AppError, globalErrorHandler, handleMongooseError, handleJWTError };