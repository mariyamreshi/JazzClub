const schedules = require('../models/employee-schedule.model');

const days = new Set(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);
const validId = value => /^[1-9]\d*$/.test(String(value || '')) && Number(value) <= 4294967295;
const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

function validateSchedule(body = {}) {
  const start = typeof body.start_time === 'string' ? body.start_time.slice(0, 5) : '';
  const end = typeof body.end_time === 'string' ? body.end_time.slice(0, 5) : '';
  if (!validId(body.employee_id) || !days.has(body.day_of_week) || !validTime(body.start_time) ||
      !validTime(body.end_time) || start >= end) {
    return { error: 'Choose an employee, day, and a valid start/end time.' };
  }
  return { value: { employee_id: Number(body.employee_id), day_of_week: body.day_of_week, start_time: start, end_time: end } };
}

function knownError(error, res, next) {
  const known = {
    EMPLOYEE_NOT_FOUND: [404, 'The selected employee no longer exists.'],
    SCHEDULE_NOT_FOUND: [404, 'Employee schedule not found.'],
    SCHEDULE_OVERLAP: [409, 'This employee already has an overlapping schedule on that day.'],
  };
  if (!known[error.code]) return next(error);
  const [status, message] = known[error.code];
  return res.status(status).json({ error: { code: error.code, message } });
}

async function list(req, res, next) { try { res.set('Cache-Control','no-store'); res.json({ data: await schedules.list() }); } catch (e) { next(e); } }
async function getOne(req, res, next) {
  if (!validId(req.params.scheduleId)) return res.status(400).json({ error: { code:'VALIDATION_ERROR', message:'Invalid schedule ID.' } });
  try { const row = await schedules.findById(Number(req.params.scheduleId)); if (!row) return res.status(404).json({ error:{ code:'SCHEDULE_NOT_FOUND', message:'Employee schedule not found.' } }); res.json({ data: row }); } catch (e) { next(e); }
}
async function create(req, res, next) { const {value,error}=validateSchedule(req.body||{}); if(error)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:error}}); try{res.status(201).json({data:await schedules.create(value)});}catch(e){knownError(e,res,next);} }
async function update(req, res, next) { if(!validId(req.params.scheduleId))return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid schedule ID.'}}); const {value,error}=validateSchedule(req.body||{}); if(error)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:error}}); try{res.json({data:await schedules.update(Number(req.params.scheduleId),value)});}catch(e){knownError(e,res,next);} }
async function remove(req,res,next){if(!validId(req.params.scheduleId))return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid schedule ID.'}});try{if(!await schedules.remove(Number(req.params.scheduleId)))return res.status(404).json({error:{code:'SCHEDULE_NOT_FOUND',message:'Employee schedule not found.'}});res.status(204).end();}catch(e){next(e);} }

module.exports = { list, getOne, create, update, remove, validateSchedule };
