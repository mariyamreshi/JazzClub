const shifts = require('../models/employee-shift.model');

const validId = value => /^[1-9]\d*$/.test(String(value || '')) && Number(value) <= 4294967295;
const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateShift(body = {}) {
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  const startTime = typeof body.start_time === 'string' ? body.start_time.slice(0, 5) : '';
  const endTime = typeof body.end_time === 'string' ? body.end_time.slice(0, 5) : '';
  if (!validId(body.employee_id) || !validId(body.show_id) || !role || role.length > 60 ||
      !validDate(body.shift_date) || !validTime(body.start_time) || !validTime(body.end_time) || startTime >= endTime) {
    return { error: 'Choose an employee and show, then enter a valid role, date, and time range.' };
  }
  return { value: {
    employee_id: Number(body.employee_id),
    show_id: Number(body.show_id),
    role,
    shift_date: body.shift_date,
    start_time: startTime,
    end_time: endTime,
  } };
}

function respondWithKnownError(error, res, next) {
  const known = {
    EMPLOYEE_NOT_FOUND: [404, 'The selected employee no longer exists.'],
    EMPLOYEE_NOT_ACTIVE: [409, 'Only active employees can be assigned to a shift.'],
    SHOW_NOT_FOUND: [404, 'The selected show no longer exists.'],
    SHIFT_DATE_MISMATCH: [409, 'Shift date must match the selected show date.'],
    SHIFT_OVERLAP: [409, 'This employee already has an overlapping shift.'],
    SHIFT_NOT_FOUND: [404, 'Shift assignment not found.'],
  };
  if (!known[error.code]) return next(error);
  const [status, message] = known[error.code];
  return res.status(status).json({ error: { code: error.code, message } });
}

async function list(req, res, next) {
  const { from, to } = req.query;
  if (!validDate(from) || !validDate(to) || from > to) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Provide a valid from and to date.' } });
  }
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ data: await shifts.list(from, to) });
  } catch (error) { next(error); }
}

async function getOne(req, res, next) {
  if (!validId(req.params.shiftId)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid shift ID.' } });
  }
  try {
    const shift = await shifts.findById(Number(req.params.shiftId));
    if (!shift) return res.status(404).json({ error: { code: 'SHIFT_NOT_FOUND', message: 'Shift assignment not found.' } });
    res.set('Cache-Control', 'no-store');
    res.json({ data: shift });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  const { value, error } = validateShift(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    res.status(201).json({ data: await shifts.create(value) });
  } catch (error) { return respondWithKnownError(error, res, next); }
}

async function update(req, res, next) {
  if (!validId(req.params.shiftId)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid shift ID.' } });
  }
  const { value, error } = validateShift(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    res.json({ data: await shifts.update(Number(req.params.shiftId), value) });
  } catch (error) { return respondWithKnownError(error, res, next); }
}

async function remove(req, res, next) {
  if (!validId(req.params.shiftId)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid shift ID.' } });
  }
  try {
    if (!await shifts.remove(Number(req.params.shiftId))) {
      return res.status(404).json({ error: { code: 'SHIFT_NOT_FOUND', message: 'Shift assignment not found.' } });
    }
    res.status(204).end();
  } catch (error) { next(error); }
}

module.exports = { list, getOne, create, update, remove, validateShift };
