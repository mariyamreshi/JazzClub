const shows = require('../models/show.model');

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
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 4294967295) {
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

module.exports = { listShows, getShow };
