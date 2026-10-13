const db = require('../config/db');

const fields = `es.schedule_id, es.employee_id, e.employee_name, es.day_of_week,
  TIME_FORMAT(es.start_time, '%H:%i') AS start_time,
  TIME_FORMAT(es.end_time, '%H:%i') AS end_time`;

function scheduleError(code) { return Object.assign(new Error(code), { code }); }
function normalize(row) {
  return row ? { ...row, schedule_id: Number(row.schedule_id), employee_id: Number(row.employee_id) } : null;
}

async function list() {
  const [rows] = await db.execute(
    `SELECT ${fields} FROM employee_schedules es
     JOIN employees e ON e.employee_id = es.employee_id
     ORDER BY FIELD(es.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
              es.start_time, e.employee_name`
  );
  return rows.map(normalize);
}

async function findById(id, executor = db) {
  const [rows] = await executor.execute(
    `SELECT ${fields} FROM employee_schedules es
     JOIN employees e ON e.employee_id = es.employee_id WHERE es.schedule_id = ?`, [id]
  );
  return normalize(rows[0]);
}

async function validate(connection, schedule, excludedId = null) {
  const [employees] = await connection.execute(
    'SELECT employee_id FROM employees WHERE employee_id = ? FOR UPDATE', [schedule.employee_id]
  );
  if (!employees.length) throw scheduleError('EMPLOYEE_NOT_FOUND');
  const values = [schedule.employee_id, schedule.day_of_week, schedule.end_time, schedule.start_time];
  let exclude = '';
  if (excludedId !== null) { exclude = ' AND schedule_id <> ?'; values.push(excludedId); }
  const [overlaps] = await connection.execute(
    `SELECT schedule_id FROM employee_schedules
     WHERE employee_id = ? AND day_of_week = ? AND start_time < ? AND end_time > ?${exclude}
     LIMIT 1 FOR UPDATE`, values
  );
  if (overlaps.length) throw scheduleError('SCHEDULE_OVERLAP');
}

async function create(schedule) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validate(connection, schedule);
    const [result] = await connection.execute(
      `INSERT INTO employee_schedules (employee_id, day_of_week, start_time, end_time)
       VALUES (?, ?, ?, ?)`,
      [schedule.employee_id, schedule.day_of_week, schedule.start_time, schedule.end_time]
    );
    const saved = await findById(result.insertId, connection);
    await connection.commit();
    return saved;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function update(id, schedule) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT schedule_id FROM employee_schedules WHERE schedule_id = ? FOR UPDATE', [id]
    );
    if (!rows.length) throw scheduleError('SCHEDULE_NOT_FOUND');
    await validate(connection, schedule, id);
    await connection.execute(
      `UPDATE employee_schedules SET employee_id = ?, day_of_week = ?, start_time = ?, end_time = ?
       WHERE schedule_id = ?`,
      [schedule.employee_id, schedule.day_of_week, schedule.start_time, schedule.end_time, id]
    );
    const saved = await findById(id, connection);
    await connection.commit();
    return saved;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM employee_schedules WHERE schedule_id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { list, findById, create, update, remove };
