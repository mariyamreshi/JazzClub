const db = require('../config/db');

async function list() {
  // Return local date/time strings so the browser does not shift the show date.
  const [rows] = await db.execute(
    `SELECT show_id, DATE_FORMAT(show_date, '%Y-%m-%d') AS show_date,
            artist, genre, TIME_FORMAT(start_time, '%H:%i') AS start_time
     FROM shows
     ORDER BY show_date, start_time, show_id`
  );
  return rows;
}

async function findById(showId) {
  const [rows] = await db.execute(
    `SELECT show_id, DATE_FORMAT(show_date, '%Y-%m-%d') AS show_date,
            artist, genre, TIME_FORMAT(start_time, '%H:%i') AS start_time
     FROM shows WHERE show_id = ?`,
    [showId]
  );
  return rows[0] || null;
}

module.exports = { list, findById };
