const { sendError, statusCodes } = require('../utils/responseUtils');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found middleware - handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new ApiError(
    `Not found - ${req.originalUrl}`,
    statusCodes.NOT_FOUND
  );
  next(error);
};

/**
 * Error handler middleware - converts all errors to a standard format
 */
const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error('Error encountered:', err);

  let statusCode = err.statusCode || statusCodes.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Something went wrong';
  let errors = err.errors || null;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = statusCodes.BAD_REQUEST;
    message = 'Validation error';
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // Handle Cast errors (invalid ID format etc.)
  if (err.name === 'CastError') {
    statusCode = statusCodes.BAD_REQUEST;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    statusCode = statusCodes.CONFLICT;
    message = 'Duplicate field value entered';
    const field = Object.keys(err.keyValue)[0];
    errors = [`${field} already exists`];
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = statusCodes.UNAUTHORIZED;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = statusCodes.UNAUTHORIZED;
    message = 'Token expired';
  }

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    statusCode = statusCodes.BAD_REQUEST;

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size is too large';
    } else {
      message = err.message;
    }
  }

  // Send standardized error response
  return sendError(res, statusCode, message, errors ? { errors } : null);
};

module.exports = {
  ApiError,
  notFound,
  errorHandler,
};
