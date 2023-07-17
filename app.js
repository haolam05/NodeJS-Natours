/**
 * @fs - filesystem
 * @express - nodejs framework
 * @morgan - 3rd party middleware
 * @app - start application
 */
const express = require('express');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const app = express();

// MIDDLEWARES
app.use(morgan('dev')); // info regarding request (terminal)
app.use(express.json()); // to get request.body()
app.use((req, res, next) => {
  console.log('Hello from the middleware');
  next();
});
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTES
const version = 'v1';
app.use(`/api/${version}/tours`, tourRouter);
app.use(`/api/${version}/users`, userRouter);

// START SERVER
module.exports = app;
