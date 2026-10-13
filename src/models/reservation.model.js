const db = require('../config/db');

function reservationError(code, message = code) {
  return Object.assign(new Error(message), { code });
}

async function upsertCustomer(executor, reservation) {
  const [result] = await executor.execute(
    `INSERT INTO customers (name, phone, address, membership_status)
     VALUES (?, ?, NULL, 'non-member')
     ON DUPLICATE KEY UPDATE customer_id = LAST_INSERT_ID(customer_id), name = VALUES(name)`,
    [reservation.guest_name, reservation.phone_number]
  );
  return result.insertId;
}

function dateTime({ date, time }) {
  return `${date} ${time}:00`;
}

async function validateReferences(connection, reservation) {
  const [showRows] = await connection.execute(
    `SELECT show_id, DATE_FORMAT(performance_date, '%Y-%m-%d') AS performance_date,
            TIME_FORMAT(start_time, '%H:%i') AS start_time
     FROM shows WHERE show_id = ? FOR UPDATE`,
    [reservation.show_id]
  );
  if (!showRows.length) throw reservationError('SHOW_NOT_FOUND');
  if (showRows[0].performance_date !== reservation.date || showRows[0].start_time !== reservation.time) {
    throw reservationError('SHOW_TIME_MISMATCH');
  }

  const [tableRows] = await connection.execute(
    `SELECT table_id FROM club_tables
     WHERE table_id = ? AND zone = ? AND status = 'available' FOR UPDATE`,
    [reservation.table_number, reservation.zone]
  );
  if (!tableRows.length) throw reservationError('TABLE_NOT_FOUND', 'The selected table is unavailable.');
}

async function create(reservation) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validateReferences(connection, reservation);
    const customerId = await upsertCustomer(connection, reservation);
    const [result] = await connection.execute(
      `INSERT INTO reservations (customer_id, table_id, show_id, date_time, status)
       VALUES (?, ?, ?, ?, 'confirmed')`,
      [customerId, reservation.table_number, reservation.show_id, dateTime(reservation)]
    );
    await connection.commit();
    return { id: result.insertId, ...reservation, status: 'confirmed' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function bookedTables(date, time) {
  const [rows] = await db.execute(
    `SELECT DISTINCT t.table_id AS table_number
     FROM reservations r
     JOIN club_tables t ON t.table_id = r.table_id
     WHERE DATE(r.date_time) = ? AND TIME_FORMAT(r.date_time, '%H:%i') = ?
       AND r.status NOT IN ('cancelled', 'no-show')
     ORDER BY t.table_id`,
    [date, time]
  );
  return rows.map(row => row.table_number);
}

async function list() {
  const [rows] = await db.execute(
    `SELECT r.reservation_id AS id, r.show_id, c.name AS guest_name, c.phone AS phone_number,
            t.zone, t.table_id AS table_number, a.artist_name,
            DATE_FORMAT(r.date_time, '%Y-%m-%d') AS date,
            TIME_FORMAT(r.date_time, '%H:%i') AS time, r.status
     FROM reservations r
     JOIN customers c ON c.customer_id = r.customer_id
     JOIN club_tables t ON t.table_id = r.table_id
     JOIN shows s ON s.show_id = r.show_id
     JOIN artists a ON a.artist_id = s.artist_id
     ORDER BY r.date_time DESC, r.reservation_id DESC`
  );
  return rows.map(row => ({ ...row, show_id: Number(row.show_id) }));
}

async function update(id, reservation) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      'SELECT reservation_id FROM reservations WHERE reservation_id = ? FOR UPDATE',
      [id]
    );
    if (!existing.length) {
      await connection.rollback();
      return null;
    }
    await validateReferences(connection, reservation);
    const customerId = await upsertCustomer(connection, reservation);
    await connection.execute(
      `UPDATE reservations
       SET customer_id = ?, table_id = ?, show_id = ?, date_time = ?, status = 'confirmed'
       WHERE reservation_id = ?`,
      [customerId, reservation.table_number, reservation.show_id, dateTime(reservation), id]
    );
    await connection.commit();
    return { id, ...reservation, status: 'confirmed' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM reservations WHERE reservation_id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, bookedTables, list, update, remove };
