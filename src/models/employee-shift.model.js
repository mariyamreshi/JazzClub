const db = require('../config/db');

const fields = `es.shift_id, es.employee_id, e.employee_name, es.show_id, a.artist_name,
  es.role, DATE_FORMAT(es.shift_date, '%Y-%m-%d') AS shift_date,
  TIME_FORMAT(es.start_time, '%H:%i') AS start_time,
  TIME_FORMAT(es.end_time, '%H:%i') AS end_time,
  DATE_FORMAT(s.performance_date, '%Y-%m-%d') AS performance_date,
  TIME_FORMAT(s.start_time, '%H:%i') AS show_start_time,
  TIME_FORMAT(s.end_time, '%H:%i') AS show_end_time`;

const joins = `FROM employee_shifts es
  JOIN employees e ON e.employee_id = es.employee_id
  JOIN shows s ON s.show_id = es.show_id
  JOIN artists a ON a.artist_id = s.artist_id`;

function shiftError(code) {
  return Object.assign(new Error(code), { code });
}

function normalize(row) {
  if (!row) return null;
  return {
    ...row,
    shift_id: Number(row.shift_id),
    employee_id: Number(row.employee_id),
    show_id: Number(row.show_id),
  };
}

async function list(from, to) {
  const [rows] = await db.execute(
    `SELECT ${fields} ${joins}
     WHERE es.shift_date BETWEEN ? AND ?
     ORDER BY es.shift_date, es.start_time, es.role, es.shift_id`,
    [from, to]
  );
  return rows.map(normalize);
}

async function findById(shiftId, executor = db) {
  const [rows] = await executor.execute(
    `SELECT ${fields} ${joins} WHERE es.shift_id = ?`,
    [shiftId]
  );
  return normalize(rows[0]);
}

async function validateReferences(connection, shift, excludedShiftId = null) {
  const [employeeRows] = await connection.execute(
    'SELECT employee_id, status FROM employees WHERE employee_id = ? FOR UPDATE',
    [shift.employee_id]
  );
  if (!employeeRows.length) throw shiftError('EMPLOYEE_NOT_FOUND');
  if (employeeRows[0].status !== 'Active') throw shiftError('EMPLOYEE_NOT_ACTIVE');

  const [showRows] = await connection.execute(
    `SELECT show_id, DATE_FORMAT(performance_date, '%Y-%m-%d') AS performance_date
     FROM shows WHERE show_id = ? FOR UPDATE`,
    [shift.show_id]
  );
  if (!showRows.length) throw shiftError('SHOW_NOT_FOUND');
  if (showRows[0].performance_date !== shift.shift_date) throw shiftError('SHIFT_DATE_MISMATCH');

  const values = [shift.employee_id, shift.shift_date, shift.end_time, shift.start_time];
  let exclude = '';
  if (excludedShiftId !== null) {
    exclude = ' AND shift_id <> ?';
    values.push(excludedShiftId);
  }
  const [overlaps] = await connection.execute(
    `SELECT shift_id FROM employee_shifts
     WHERE employee_id = ? AND shift_date = ?
       AND start_time < ? AND end_time > ?${exclude}
     LIMIT 1 FOR UPDATE`,
    values
  );
  if (overlaps.length) throw shiftError('SHIFT_OVERLAP');
}

async function create(shift) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validateReferences(connection, shift);
    const [result] = await connection.execute(
      `INSERT INTO employee_shifts (employee_id, show_id, role, shift_date, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [shift.employee_id, shift.show_id, shift.role, shift.shift_date, shift.start_time, shift.end_time]
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

async function update(shiftId, shift) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      'SELECT shift_id FROM employee_shifts WHERE shift_id = ? FOR UPDATE',
      [shiftId]
    );
    if (!existing.length) throw shiftError('SHIFT_NOT_FOUND');
    await validateReferences(connection, shift, shiftId);
    await connection.execute(
      `UPDATE employee_shifts
       SET employee_id = ?, show_id = ?, role = ?, shift_date = ?, start_time = ?, end_time = ?
       WHERE shift_id = ?`,
      [shift.employee_id, shift.show_id, shift.role, shift.shift_date, shift.start_time, shift.end_time, shiftId]
    );
    const saved = await findById(shiftId, connection);
    await connection.commit();
    return saved;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function remove(shiftId) {
  const [result] = await db.execute('DELETE FROM employee_shifts WHERE shift_id = ?', [shiftId]);
  return result.affectedRows > 0;
}

module.exports = { list, findById, create, update, remove, normalize };
