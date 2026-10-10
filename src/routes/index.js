const express = require('express');
const router = express.Router();

const home = require('../controllers/home.controller');
const health = require('../controllers/health.controller');
const reservationController = require('../controllers/reservation.controller');
const showController = require('../controllers/show.controller');
const menuController = require('../controllers/menu.controller');

// Home & Health routes (from your friend)
router.get('/', home.index);
router.get('/api/health', health.server);
router.get('/api/health/db', health.database);
router.get('/api/shows', showController.listShows);
router.get('/api/shows/:showId', showController.getShow);

// Guest menu and admin menu management.
router.get('/api/menu-items', menuController.listPublic);
router.get('/api/admin/menu-items', menuController.listAdmin);
router.post('/api/menu-items', menuController.createItem);
router.put('/api/menu-items/:itemId', menuController.updateItem);
router.delete('/api/menu-items/:itemId', menuController.deleteItem);

// Reservation routes (your part)
router.get('/api/reservations', reservationController.listReservations);
router.get('/api/reservations/availability', reservationController.getAvailability);
router.post('/api/reservations', reservationController.createReservation);
router.put('/api/reservations/:id', reservationController.updateReservation);
router.delete('/api/reservations/:id', reservationController.deleteReservation);

module.exports = router;
