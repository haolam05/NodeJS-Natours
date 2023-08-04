/* eslint-disable import/no-extraneous-dependencies */
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const globalErrorHandler = require('./controller/errorController');
const AppError = require('./utils/appError');

const app = express();

// use bug as view engine, have access to all .pug files in views folder (render)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Helper functions
const limiter = rateLimit({
  max: 100, // 100 requests per hour
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});

// GLOBAL MIDDLEWARES
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Serving static files (from public folder)
// All rendered .pug files will have access to route from /public
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Limit requests from the same API
app.use('/api', limiter);

// Parse data from body, and parse data from cookie (to get jwt login token)
// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // limit data injected into body
app.use(cookieParser()); // req.cookies

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XXS (Cross Site Scripting) attacks
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      // fields that allow duplicate
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  next();
});

// ROUTES
app.use('/', viewRouter);
app.use(`/api/${process.env.VERSION}/tours`, tourRouter);
app.use(`/api/${process.env.VERSION}/users`, userRouter);
app.use(`/api/${process.env.VERSION}/reviews`, reviewRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// SERVER
module.exports = app;
