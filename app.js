const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const globalErrorHandler = require('./controller/errorController');
const AppError = require('./utils/appError');

const app = express();

// Helper functions
const limiter = rateLimit({
  max: 100, // 100 requests per hour
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});

// GLOBAL MIDDLEWARES
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
app.use('/api', limiter);
app.use(express.json());
app.use(express.static(`${__dirname}/public`));
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTES
app.use(`/api/${process.env.VERSION}/tours`, tourRouter);
app.use(`/api/${process.env.VERSION}/users`, userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// SERVER
module.exports = app;
