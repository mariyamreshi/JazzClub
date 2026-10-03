const reservations = require('../models/reservation.model');

// Table codes and zones currently displayed on the reservation floor plan.
const tablesByZone = {
  'Front Stage': ['F01', 'F02', 'F03', 'F04'],
  'Main Floor': ['M01', 'M02', 'M03'],
  'VIP Lounge': ['VIP-1', 'VIP-2'],
  'Bar Counter': ['B01', 'B02', 'B03', 'B04'],
};

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function createReservation(req, res, next) {
  const fields = ['guest_name', 'phone_number', 'zone', 'table_number', 'date', 'time'];
  const body = req.body || {};
  const invalid = message => res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message },
  });

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
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return invalid('Please enter a valid time in HH:mm format.');
  }

  try {
    const saved = await reservations.create(reservation);
    res.status(201).json({ data: saved });
  } catch (error) {
    next(error);
  }
}

module.exports = { createReservation };
