const shifts = require('../models/employee-shift.model');

const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
const validId = value => /^[1-9]\d*$/.test(String(value || '')) && Number(value) <= 4294967295;

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

async function create(req, res, next) {
  const body = req.body || {};
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  const start = body.start_time;
  const end = body.end_time;
  if (!validId(body.employee_id) || !validId(body.show_id) || !role || role.length > 60 ||
      !validDate(body.shift_date) || !validTime(start) || !validTime(end) || start >= end) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose an employee and show, then enter a valid role, date, and time range.' } });
  }
  try {
    res.status(201).json({ data: await shifts.create({
      employee_id: Number(body.employee_id), show_id: Number(body.show_id), role,
      shift_date: body.shift_date, start_time: start, end_time: end,
    }) });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: { code: 'INVALID_REFERENCE', message: 'The selected employee or show no longer exists.' } });
    }
    next(error);
  }
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

async function listRoleTargets(req, res, next) {
  const { from, to } = req.query;
  if (!validDate(from) || !validDate(to) || from > to) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Provide a valid from and to date.' } });
  }
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ data: await shifts.listRoleTargets(from, to) });
  } catch (error) { next(error); }
}

async function saveRoleTarget(req, res, next) {
  const body = req.body || {};
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  const targetCount = body.target_count;
  if (!validDate(body.target_date) || !role || role.length > 60 ||
      typeof targetCount !== 'number' || !Number.isInteger(targetCount) || targetCount < 0 || targetCount > 999) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a date and role, and set a staffing target from 0 to 999.' } });
  }
  try {
    const target = await shifts.saveRoleTarget({
      target_date: body.target_date,
      role,
      target_count: targetCount,
    });
    res.json({ data: target });
  } catch (error) { next(error); }
}

module.exports = { list, create, remove, listRoleTargets, saveRoleTarget };
