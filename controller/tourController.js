// const sharp = require('sharp')
const multer = require('multer');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/tours'); // params: err - destination to save img (ON DISK)
  },
  filename: (req, file, cb) => {
    const extension = file.mimetype.split('/')[1];
    const filename =
      file.fieldname === 'imageCover'
        ? `tour-${req.params.id}-${Date.now()}-cover.${extension}`
        : `tour-${req.params.id}-${Date.now()}-${file.originalname
            .split('.')[0]
            .slice(-1)}.${extension}`;

    cb(null, filename);
  },
});
// const multerStorage = multer.memoryStorage(); // saved in memory (available on req.files)

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) return cb(null, true);
  cb(new AppError('Not an image! Please upload only images.', 400), false);
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  // #fields: mix of #array (req.files) and #single (req.file)
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = (req, res, next) => {
  if (!req.files.imageCover && !req.files.images) return next();

  req.body.imageCover = req.files.imageCover[0].filename;

  req.body.images = [];
  req.files.images.forEach(img => req.body.images.push(img.filename));
  next();
};
// exports.resizeTourImages = catchAsync(async (req, res, next) => {
//   if (!req.files.imageCover || !req.files.images) return next();

//   // 1) Cover image
//   req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
//   await sharp(req.files.imageCover[0].buffer)
//     .resize(2000, 1333)
//     .toFormat('jpeg')
//     .jpeg({ quality: 90 })
//     .toFile(`public/img/tours/${req.body.imageCover}`);

//   // 2) Images
//   req.body.images = [];
//   await Promise.all(
//     req.files.images.map(async (file, i) => {
//       const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

//       await sharp(file.buffer)
//         .resize(2000, 1333)
//         .toFormat('jpeg')
//         .jpeg({ quality: 90 })
//         .toFile(`public/img/tours/${filename}`);

//       req.body.images.push(filename);
//     })
//   );

//   next();
// });

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

exports.getTourStats = catchAsync(async (req, res, next) => {
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

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
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

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng)
    return next(
      new AppError(
        'Please provide lattitude and longitude in the format lat,lng.',
        400,
      ),
    );
  if (unit !== 'mi' && unit !== 'km')
    return next(
      new AppError('Unit must be in miles(mi) or kilometer(km).', 400),
    );

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multipler = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng)
    return next(
      new AppError(
        'Please provide lattitude and longitude in the format lat,lng.',
        400,
      ),
    );
  if (unit !== 'mi' && unit !== 'km')
    return next(
      new AppError('Unit must be in miles(mi) or kilometer(km).', 400),
    );

  const distances = await Tour.aggregate([
    {
      // must be first stage
      // requires at least 1 field contains a geospatial index
      // tourSchema.index({ startLocation: '2dsphere' });
      // https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/#mongodb-pipeline-pipe.-geoNear
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [+lng, +lat],
        },
        distanceField: 'distance',
        distanceMultiplier: multipler,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
