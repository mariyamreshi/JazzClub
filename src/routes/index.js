const express = require('express');
const router = express.Router();

const home = require('../controllers/home.controller');
const health = require('../controllers/health.controller');
const reservationController = require('../controllers/reservation.controller');
const showController = require('../controllers/show.controller');

// Home & Health routes (from your friend)
router.get('/', home.index);
router.get('/api/health', health.server);
router.get('/api/health/db', health.database);
router.get('/api/shows', showController.listShows);
router.get('/api/shows/:showId', showController.getShow);

// Reservation routes (your part)
router.get('/api/reservations/availability', reservationController.getAvailability);
router.post('/api/reservations', reservationController.createReservation);

module.exports = router;
