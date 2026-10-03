const db = require('../config/db');

async function create(reservation) {
  const { guest_name, phone_number, zone, table_number, date, time } = reservation;
  const [result] = await db.execute(
    'INSERT INTO reservations (guest_name, phone_number, zone, table_number, `date`, `time`) VALUES (?, ?, ?, ?, ?, ?)',
    [guest_name, phone_number, zone, table_number, date, time]
  );

  return { id: result.insertId, ...reservation };
}

module.exports = { create };
