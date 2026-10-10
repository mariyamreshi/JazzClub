const reservations = require('../models/reservation.model');

// Table codes and zones currently displayed on the reservation floor plan.
const tablesByZone = {
  'Front Stage': ['F01', 'F02', 'F03', 'F04'],
  'Main Floor': ['M01', 'M02', 'M03'],
  'VIP Lounge': ['VIP-1', 'VIP-2'],
  'Bar Counter': ['B01', 'B02', 'B03', 'B04'],
};
const reservationTimes = new Set(['20:00', '20:30', '21:00']);

function validDate(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateReservation(body = {}) {
  const fields = ['guest_name', 'phone_number', 'zone', 'table_number', 'date', 'time'];
  const invalid = message => ({ error: message });

  if (fields.some(field => typeof body[field] !== 'string' || !body[field].trim())) {
    return invalid('Please provide guest name, phone number, zone, table, date and time.');
  }

  const reservation = Object.fromEntries(fields.map(field => [field, body[field].trim()]));
  const { guest_name, phone_number, zone, table_number, date, time } = reservation;

  if (guest_name.length > 100) return invalid('Guest name must be at most 100 characters.');
  const phoneDigits = phone_number.replace(/\D/g, '');
  if (phone_number.length > 25 || !/^\+?[0-9 ()-]+$/.test(phone_number) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return invalid('Please enter a valid phone number (7–15 digits).');
  }
  if (!Object.hasOwn(tablesByZone, zone) || !tablesByZone[zone].includes(table_number)) {
    return invalid('Please select a valid table and its zone.');
  }
  if (!validDate(date)) return invalid('Please enter a valid date in YYYY-MM-DD format.');
  if (!reservationTimes.has(time)) {
    return invalid('Please select 20:00, 20:30 or 21:00.');
  }

  return { reservation };
}

function reservationError(error, res, next) {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: { code: 'TABLE_ALREADY_BOOKED', message: 'This table is already booked for the selected date and time. Please choose another table or time.' },
    });
  }
  if (error.code === 'TABLE_NOT_FOUND') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
  }
  next(error);
}

function validId(value) {
  return /^[1-9]\d*$/.test(value) && Number(value) <= 4294967295;
}

async function createReservation(req, res, next) {
  const { reservation, error } = validateReservation(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    const saved = await reservations.create(reservation);
    res.status(201).json({ data: saved });
  } catch (error) {
    reservationError(error, res, next);
  }
}

async function getAvailability(req, res, next) {
  const { date, time } = req.query;
  if (!validDate(date)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid date in YYYY-MM-DD format.' },
    });
  }
  if (typeof time !== 'string' || !reservationTimes.has(time)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please select 20:00, 20:30 or 21:00.' },
    });
  }
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ data: { date, time, booked_tables: await reservations.bookedTables(date, time) } });
  } catch (error) {
    next(error);
  }
}

async function listReservations(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ data: await reservations.list() });
  } catch (error) {
    next(error);
  }
}

async function updateReservation(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid reservation ID.' } });
  const { reservation, error } = validateReservation(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    const updated = await reservations.update(Number(req.params.id), reservation);
    if (!updated) return res.status(404).json({ error: { code: 'RESERVATION_NOT_FOUND', message: 'This reservation no longer exists. Please refresh the list.' } });
    res.json({ data: updated });
  } catch (error) {
    reservationError(error, res, next);
  }
}

async function deleteReservation(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid reservation ID.' } });
  try {
    const removed = await reservations.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: { code: 'RESERVATION_NOT_FOUND', message: 'This reservation no longer exists. Please refresh the list.' } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = { createReservation, getAvailability, listReservations, updateReservation, deleteReservation };
