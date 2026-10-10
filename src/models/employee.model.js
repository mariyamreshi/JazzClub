const db = require('../config/db');

const selectFields = 'employee_id, employee_name, phone, status, employment_type';

async function list() {
  const [rows] = await db.execute(
    `SELECT ${selectFields} FROM employees ORDER BY employee_name, employee_id`
  );
  return rows;
}

async function findById(employeeId) {
  const [rows] = await db.execute(
    `SELECT ${selectFields} FROM employees WHERE employee_id = ?`,
    [employeeId]
  );
  return rows[0] || null;
}

async function create(employee) {
  const { employee_name, phone, status, employment_type } = employee;
  const [result] = await db.execute(
    `INSERT INTO employees (employee_name, phone, status, employment_type)
     VALUES (?, ?, ?, ?)`,
    [employee_name, phone, status, employment_type]
  );
  return { employee_id: result.insertId, ...employee };
}

async function update(employeeId, employee) {
  const { employee_name, phone, status, employment_type } = employee;
  const [result] = await db.execute(
    `UPDATE employees
     SET employee_name = ?, phone = ?, status = ?, employment_type = ?
     WHERE employee_id = ?`,
    [employee_name, phone, status, employment_type, employeeId]
  );
  return result.affectedRows ? { employee_id: employeeId, ...employee } : null;
}

async function remove(employeeId) {
  const [result] = await db.execute('DELETE FROM employees WHERE employee_id = ?', [employeeId]);
  return result.affectedRows > 0;
}

module.exports = { list, findById, create, update, remove };
