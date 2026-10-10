const express = require('express');
const router = express.Router();

const home = require('../controllers/home.controller');
const health = require('../controllers/health.controller');
const reservationController = require('../controllers/reservation.controller');
const showController = require('../controllers/show.controller');
const employeeController = require('../controllers/employee.controller');
const employeeShiftController = require('../controllers/employee-shift.controller');
const menuController = require('../controllers/menu.controller');

// Home & Health routes (from your friend)
router.get('/', home.index);
router.get('/api/health', health.server);
router.get('/api/health/db', health.database);
router.get('/api/shows', showController.listShows);
router.get('/api/shows/:showId', showController.getShow);

router.get('/api/employees', employeeController.listEmployees);
router.get('/api/employees/:employeeId', employeeController.getEmployee);
router.post('/api/employees', employeeController.createEmployee);
router.put('/api/employees/:employeeId', employeeController.updateEmployee);
router.delete('/api/employees/:employeeId', employeeController.deleteEmployee);
router.get('/api/employee-shifts', employeeShiftController.list);
router.post('/api/employee-shifts', employeeShiftController.create);
router.delete('/api/employee-shifts/:shiftId', employeeShiftController.remove);
router.get('/api/employee-role-targets', employeeShiftController.listRoleTargets);
router.put('/api/employee-role-targets', employeeShiftController.saveRoleTarget);

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
