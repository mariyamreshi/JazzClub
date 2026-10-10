const db = require('../config/db');

const selectFields = `s.show_id, s.artist_id, a.artist_name, a.artist_type, a.genre,
  DATE_FORMAT(s.performance_date, '%Y-%m-%d') AS performance_date,
  TIME_FORMAT(s.start_time, '%H:%i') AS start_time,
  TIME_FORMAT(s.end_time, '%H:%i') AS end_time`;

async function list() {
  const [rows] = await db.execute(
    `SELECT ${selectFields}
     FROM shows s
     JOIN artists a ON a.artist_id = s.artist_id
     ORDER BY s.performance_date, s.start_time, s.show_id`
  );
  return rows;
}

async function findById(showId) {
  const [rows] = await db.execute(
    `SELECT ${selectFields}
     FROM shows s
     JOIN artists a ON a.artist_id = s.artist_id
     WHERE s.show_id = ?`,
    [showId]
  );
  return rows[0] || null;
}

module.exports = { list, findById };
