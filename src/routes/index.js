const express = require('express');
const router = express.Router();

const home = require('../controllers/home.controller');
const health = require('../controllers/health.controller');
const reservationController = require('../controllers/reservation.controller');
const showController = require('../controllers/show.controller');
const employeeController = require('../controllers/employee.controller');
const employeeShiftController = require('../controllers/employee-shift.controller');
const employeeScheduleController = require('../controllers/employee-schedule.controller');
const menuController = require('../controllers/menu.controller');
const orderController = require('../controllers/order.controller');
const paymentController = require('../controllers/payment.controller');

// Home & Health routes (from your friend)
router.get('/', home.index);
router.get('/api/health', health.server);
router.get('/api/health/db', health.database);
router.get('/api/shows', showController.listShows);
router.get('/api/shows/:showId', showController.getShow);
router.post('/api/shows', showController.createShow);
router.put('/api/shows/:showId', showController.updateShow);
router.delete('/api/shows/:showId', showController.deleteShow);

router.get('/api/employees', employeeController.listEmployees);
router.get('/api/employees/:employeeId', employeeController.getEmployee);
router.post('/api/employees', employeeController.createEmployee);
router.put('/api/employees/:employeeId', employeeController.updateEmployee);
router.delete('/api/employees/:employeeId', employeeController.deleteEmployee);
router.get('/api/employee-shifts', employeeShiftController.list);
router.get('/api/employee-shifts/:shiftId', employeeShiftController.getOne);
router.post('/api/employee-shifts', employeeShiftController.create);
router.put('/api/employee-shifts/:shiftId', employeeShiftController.update);
router.delete('/api/employee-shifts/:shiftId', employeeShiftController.remove);
router.get('/api/employee-schedules', employeeScheduleController.list);
router.get('/api/employee-schedules/:scheduleId', employeeScheduleController.getOne);
router.post('/api/employee-schedules', employeeScheduleController.create);
router.put('/api/employee-schedules/:scheduleId', employeeScheduleController.update);
router.delete('/api/employee-schedules/:scheduleId', employeeScheduleController.remove);

// Guest menu and admin menu management.
router.get('/api/menu-items', menuController.listPublic);
router.get('/api/admin/menu-items', menuController.listAdmin);
router.post('/api/menu-items', menuController.createItem);
router.put('/api/menu-items/:itemId', menuController.updateItem);
router.delete('/api/menu-items/:itemId', menuController.deleteItem);

// Guest table ordering. Each order owns one or more ORDER_ITEM rows.
router.get('/api/tables', orderController.listTables);
router.get('/api/orders', orderController.listOrders);
router.post('/api/orders', orderController.createOrder);
router.post('/api/payments', paymentController.createPayment);

// Reservation routes (your part)
router.get('/api/reservations', reservationController.listReservations);
router.get('/api/reservations/availability', reservationController.getAvailability);
router.post('/api/reservations', reservationController.createReservation);
router.put('/api/reservations/:id', reservationController.updateReservation);
router.delete('/api/reservations/:id', reservationController.deleteReservation);

module.exports = router;
