const AppError = require('../utils/appError');

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpireError = () =>
  new AppError('Expired token! PLease log in again.', 401);

const handleValidationErrorDB = err => {
  const msg = Object.values(err.errors)
    .map(e => e.message)
    .join('. ');
  return new AppError(msg, 400);
};

const handleDuplicateFieldsDB = err => {
  const msg = `Duplicate field value: '${err.keyValue.name}'. Please use another value!`;
  return new AppError(msg, 400);
};

const handleCastErrorDB = err => {
  const msg = `Invalid ${err.path}: ${err.value}`;
  return new AppError(msg, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    console.log(err);
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error('ERROR ❌', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') sendErrorDev(err, res);
  if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.name = err.name;
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error); // invalid DB id
    if (error.code === 11000) error = handleDuplicateFieldsDB(error); // duplicate DB field
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error); // invalid field value, ex: name too short
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError') error = handleJWTExpireError(error);

    sendErrorProd(error, res);
  }
};
