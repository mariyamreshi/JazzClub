const db = require('../config/db');

async function upsertCustomer(reservation) {
  const [result] = await db.execute(
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

async function create(reservation) {
  const customerId = await upsertCustomer(reservation);
  const [result] = await db.execute(
    `INSERT INTO reservations (customer_id, table_id, date_time, status)
     SELECT ?, table_id, ?, 'confirmed'
     FROM club_tables
     WHERE table_id = ? AND zone = ? AND status = 'available'`,
    [customerId, dateTime(reservation), reservation.table_number, reservation.zone]
  );
  if (!result.affectedRows) throw Object.assign(new Error('The selected table is unavailable.'), { code: 'TABLE_NOT_FOUND' });
  return { id: result.insertId, ...reservation };
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
    `SELECT r.reservation_id AS id, c.name AS guest_name, c.phone AS phone_number,
            t.zone, t.table_id AS table_number,
            DATE_FORMAT(r.date_time, '%Y-%m-%d') AS date,
            TIME_FORMAT(r.date_time, '%H:%i') AS time
     FROM reservations r
     JOIN customers c ON c.customer_id = r.customer_id
     JOIN club_tables t ON t.table_id = r.table_id
     ORDER BY r.date_time DESC, r.reservation_id DESC`
  );
  return rows;
}

async function update(id, reservation) {
  const customerId = await upsertCustomer(reservation);
  const [result] = await db.execute(
    `UPDATE reservations r
     JOIN club_tables t ON t.table_id = ? AND t.zone = ? AND t.status = 'available'
     SET r.customer_id = ?, r.table_id = t.table_id, r.date_time = ?, r.status = 'confirmed'
     WHERE r.reservation_id = ?`,
    [reservation.table_number, reservation.zone, customerId, dateTime(reservation), id]
  );
  return result.affectedRows ? { id, ...reservation } : null;
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM reservations WHERE reservation_id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, bookedTables, list, update, remove };
