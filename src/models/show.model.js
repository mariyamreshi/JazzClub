const db = require('../config/db');

const selectFields = `s.show_id, s.artist_id, a.artist_name, a.artist_type, a.genre,
  DATE_FORMAT(s.performance_date, '%Y-%m-%d') AS performance_date,
  TIME_FORMAT(s.start_time, '%H:%i') AS start_time,
  TIME_FORMAT(s.end_time, '%H:%i') AS end_time,
  (SELECT COUNT(*) FROM reservations r
   WHERE r.show_id = s.show_id AND r.status NOT IN ('cancelled', 'no-show')) AS reservation_count,
  (SELECT COALESCE(SUM(t.capacity), 0)
   FROM reservations r JOIN club_tables t ON t.table_id = r.table_id
   WHERE r.show_id = s.show_id AND r.status NOT IN ('cancelled', 'no-show')) AS reserved_seats,
  (SELECT COUNT(*) FROM club_tables t WHERE t.status = 'available') AS total_tables,
  (SELECT COALESCE(SUM(t.capacity), 0) FROM club_tables t WHERE t.status = 'available') AS total_capacity`;

function showError(code) {
  return Object.assign(new Error(code), { code });
}

function normalize(row) {
  if (!row) return null;
  return {
    ...row,
    show_id: Number(row.show_id),
    artist_id: Number(row.artist_id),
    reservation_count: Number(row.reservation_count ?? 0),
    reserved_seats: Number(row.reserved_seats ?? 0),
    total_tables: Number(row.total_tables ?? 0),
    total_capacity: Number(row.total_capacity ?? 0),
  };
}

async function list() {
  const [rows] = await db.execute(
    `SELECT ${selectFields}
     FROM shows s
     JOIN artists a ON a.artist_id = s.artist_id
     ORDER BY s.performance_date, s.start_time, s.show_id`
  );
  return rows.map(normalize);
}

async function findById(showId, executor = db) {
  const [rows] = await executor.execute(
    `SELECT ${selectFields}
     FROM shows s
     JOIN artists a ON a.artist_id = s.artist_id
     WHERE s.show_id = ?`,
    [showId]
  );
  return normalize(rows[0]);
}

async function saveArtist(connection, show) {
  const [rows] = await connection.execute(
    'SELECT artist_id FROM artists WHERE artist_name = ? FOR UPDATE',
    [show.artist_name]
  );
  if (rows.length) {
    const artistId = Number(rows[0].artist_id);
    await connection.execute(
      'UPDATE artists SET artist_type = ?, genre = ? WHERE artist_id = ?',
      [show.artist_type, show.genre, artistId]
    );
    return artistId;
  }
  const [result] = await connection.execute(
    'INSERT INTO artists (artist_name, artist_type, genre) VALUES (?, ?, ?)',
    [show.artist_name, show.artist_type, show.genre]
  );
  return result.insertId;
}

async function create(show) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const artistId = await saveArtist(connection, show);
    const [result] = await connection.execute(
      `INSERT INTO shows (artist_id, performance_date, start_time, end_time)
       VALUES (?, ?, ?, ?)`,
      [artistId, show.performance_date, show.start_time, show.end_time]
    );
    const saved = await findById(result.insertId, connection);
    await connection.commit();
    return saved;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function update(showId, show) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      'SELECT show_id FROM shows WHERE show_id = ? FOR UPDATE', [showId]
    );
    if (!existing.length) throw showError('SHOW_NOT_FOUND');

    const artistId = await saveArtist(connection, show);
    await connection.execute(
      `UPDATE shows SET artist_id = ?, performance_date = ?, start_time = ?, end_time = ?
       WHERE show_id = ?`,
      [artistId, show.performance_date, show.start_time, show.end_time, showId]
    );
    // These values repeat the selected show slot throughout the ERD. Keep them
    // synchronized when an administrator reschedules a show.
    await connection.execute(
      'UPDATE reservations SET date_time = TIMESTAMP(?, ?) WHERE show_id = ?',
      [show.performance_date, show.start_time, showId]
    );
    await connection.execute(
      'UPDATE employee_shifts SET shift_date = ? WHERE show_id = ?',
      [show.performance_date, showId]
    );
    const saved = await findById(showId, connection);
    await connection.commit();
    return saved;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function remove(showId) {
  const [result] = await db.execute('DELETE FROM shows WHERE show_id = ?', [showId]);
  return result.affectedRows > 0;
}

module.exports = { list, findById, create, update, remove, normalize };
