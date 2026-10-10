const db = require('../config/db');

const fields = `es.shift_id, es.employee_id, e.employee_name, es.show_id, a.artist_name,
  es.role, DATE_FORMAT(es.shift_date, '%Y-%m-%d') AS shift_date,
  TIME_FORMAT(es.start_time, '%H:%i') AS start_time,
  TIME_FORMAT(es.end_time, '%H:%i') AS end_time`;

async function list(from, to) {
  const [rows] = await db.execute(
    `SELECT ${fields} FROM employee_shifts es
     JOIN employees e ON e.employee_id = es.employee_id
     JOIN shows s ON s.show_id = es.show_id
     JOIN artists a ON a.artist_id = s.artist_id
     WHERE es.shift_date BETWEEN ? AND ?
     ORDER BY es.shift_date, es.start_time, es.role, es.shift_id`,
    [from, to]
  );
  return rows;
}

async function create(shift) {
  const [result] = await db.execute(
    `INSERT INTO employee_shifts (employee_id, show_id, role, shift_date, start_time, end_time)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [shift.employee_id, shift.show_id, shift.role, shift.shift_date, shift.start_time, shift.end_time]
  );
  const [rows] = await db.execute(
    `SELECT ${fields} FROM employee_shifts es
     JOIN employees e ON e.employee_id = es.employee_id
     JOIN shows s ON s.show_id = es.show_id
     JOIN artists a ON a.artist_id = s.artist_id
     WHERE es.shift_id = ?`,
    [result.insertId]
  );
  return rows[0];
}

async function remove(shiftId) {
  const [result] = await db.execute(
    'DELETE FROM employee_shifts WHERE shift_id = ?',
    [shiftId]
  );
  return result.affectedRows > 0;
}

async function listRoleTargets(from, to) {
  const [rows] = await db.execute(
    `SELECT DATE_FORMAT(target_date, '%Y-%m-%d') AS target_date, role, target_count
     FROM employee_role_targets
     WHERE target_date BETWEEN ? AND ?
     ORDER BY target_date, role`,
    [from, to]
  );
  return rows;
}

async function saveRoleTarget(target) {
  await db.execute(
    `INSERT INTO employee_role_targets (target_date, role, target_count)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE target_count = VALUES(target_count)`,
    [target.target_date, target.role, target.target_count]
  );
  return target;
}

module.exports = { list, create, remove, listRoleTargets, saveRoleTarget };
