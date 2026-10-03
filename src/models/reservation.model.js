const db = require('../config/db');

async function create(reservation) {
  const { guest_name, phone_number, zone, table_number, date, time } = reservation;
  const [result] = await db.execute(
    'INSERT INTO reservations (guest_name, phone_number, zone, table_number, `date`, `time`) VALUES (?, ?, ?, ?, ?, ?)',
    [guest_name, phone_number, zone, table_number, date, time]
  );

  return { id: result.insertId, ...reservation };
}

async function bookedTables(date) {
  const [rows] = await db.execute(
    'SELECT table_number FROM reservations WHERE `date` = ? ORDER BY table_number',
    [date]
  );
  return rows.map(row => row.table_number);
}

module.exports = { create, bookedTables };
