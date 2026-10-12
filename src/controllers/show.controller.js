const shows = require('../models/show.model');

const artistTypes = new Set(['solo', 'duo', 'group', 'resident', 'guest']);
const startTimes = new Set(['20:00', '20:30', '21:00']);
const validId = value => /^[1-9]\d*$/.test(String(value)) && Number(value) <= 4294967295;
const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateShow(body = {}) {
  const value = {
    artist_name: typeof body.artist_name === 'string' ? body.artist_name.trim() : '',
    artist_type: typeof body.artist_type === 'string' ? body.artist_type.trim().toLowerCase() : '',
    genre: typeof body.genre === 'string' ? body.genre.trim() : '',
    performance_date: body.performance_date,
    start_time: body.start_time,
    end_time: body.end_time,
  };
  if (!value.artist_name || value.artist_name.length > 150) return { error: 'Artist name must contain 1–150 characters.' };
  if (!artistTypes.has(value.artist_type)) return { error: 'Please select a valid artist type.' };
  if (!value.genre || value.genre.length > 100) return { error: 'Genre must contain 1–100 characters.' };
  if (!validDate(value.performance_date)) return { error: 'Please enter a valid performance date.' };
  if (!startTimes.has(value.start_time)) return { error: 'Show start time must be 20:00, 20:30 or 21:00.' };
  if (!validTime(value.end_time) || value.end_time <= value.start_time) return { error: 'Show end time must be later than its start time.' };
  return { value };
}

function writeError(error, res, next) {
  if (error.code === 'SHOW_NOT_FOUND') {
    return res.status(404).json({ error: { code: error.code, message: 'Show not found.' } });
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: { code: 'SHOW_SLOT_EXISTS', message: 'Another show or table booking already uses the selected date and time.' } });
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: { code: 'SHOW_IN_USE', message: 'A show with reservations or employee shifts cannot be deleted.' } });
  }
  return next(error);
}

async function listShows(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ data: await shows.list() });
  } catch (error) {
    next(error);
  }
}

async function getShow(req, res, next) {
  const id = req.params.showId;
  res.set('Cache-Control', 'no-store');
  if (!validId(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid show ID.' } });
  }
  try {
    const show = await shows.findById(Number(id));
    if (!show) {
      return res.status(404).json({ error: { code: 'SHOW_NOT_FOUND', message: 'This show is no longer available. Please choose another show.' } });
    }
    res.json({ data: show });
  } catch (error) {
    next(error);
  }
}

async function createShow(req, res, next) {
  const { value, error } = validateShow(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    res.status(201).json({ data: await shows.create(value) });
  } catch (writeFailure) {
    writeError(writeFailure, res, next);
  }
}

async function updateShow(req, res, next) {
  if (!validId(req.params.showId)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid show ID.' } });
  const { value, error } = validateShow(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    res.json({ data: await shows.update(Number(req.params.showId), value) });
  } catch (writeFailure) {
    writeError(writeFailure, res, next);
  }
}

async function deleteShow(req, res, next) {
  if (!validId(req.params.showId)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid show ID.' } });
  try {
    if (!await shows.remove(Number(req.params.showId))) {
      return res.status(404).json({ error: { code: 'SHOW_NOT_FOUND', message: 'Show not found.' } });
    }
    res.status(204).end();
  } catch (writeFailure) {
    writeError(writeFailure, res, next);
  }
}

module.exports = { listShows, getShow, createShow, updateShow, deleteShow, validateShow };
