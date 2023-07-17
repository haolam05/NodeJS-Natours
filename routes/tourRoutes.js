const express = require('express');
const tourController = require('../controller/tourController');

const router = express.Router();

// prettier-ignore
router
  .route('/')
  .get(tourController.getAllTours)
  .post(tourController.createTour);

// prettier-ignore
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(tourController.deleteTour);

module.exports = router;
