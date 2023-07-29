const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res) => {
  const year = +req.params.year;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', // unwind startDates array into its own date
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}/01/01`), // match the startDate(s)
          $lte: new Date(`${year}/12/31`), // in the given year
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // group by month (Jan-Dec)
        numTourStarts: { $sum: 1 }, // number of tours in a given month
        tours: { $push: '$name' }, // array of tours in a given month
      },
    },
    {
      $addFields: { month: '$_id' }, // add month field (more intuitive than 'id')
    },
    {
      $project: { _id: 0 }, // removed id field since we already had month field
    },
    {
      $sort: { numTourStarts: -1 }, // sort by number of tours per month (descending)
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});
