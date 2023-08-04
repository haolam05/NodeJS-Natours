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

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api'))
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });

  // B) RENDERED WEBSITE
  console.error('ERROR ❌', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      // Operational, trusted error: send message to client
      console.log(err);
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });

      // Programming or other unknown error: don't leak error details
    }

    // 1) Log error
    console.error('ERROR ❌', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }

  // B) RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }

  // 1) Log error
  console.error('ERROR ❌', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') sendErrorDev(err, req, res);
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

    sendErrorProd(error, req, res);
  }
};
