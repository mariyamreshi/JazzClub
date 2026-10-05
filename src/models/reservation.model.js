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

async function list() {
  const [rows] = await db.execute(
    `SELECT id, guest_name, phone_number, zone, table_number,
            DATE_FORMAT(\`date\`, '%Y-%m-%d') AS date,
            TIME_FORMAT(\`time\`, '%H:%i') AS time
     FROM reservations ORDER BY \`date\` DESC, \`time\`, id DESC`
  );
  return rows;
}

async function update(id, reservation) {
  const { guest_name, phone_number, zone, table_number, date, time } = reservation;
  const [result] = await db.execute(
    'UPDATE reservations SET guest_name = ?, phone_number = ?, zone = ?, table_number = ?, `date` = ?, `time` = ? WHERE id = ?',
    [guest_name, phone_number, zone, table_number, date, time, id]
  );
  return result.affectedRows ? { id, ...reservation } : null;
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM reservations WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, bookedTables, list, update, remove };
