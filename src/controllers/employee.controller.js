const employees = require('../models/employee.model');

const statuses = new Set(['Active', 'On leave', 'Inactive']);
const employmentTypes = new Set(['Full-time', 'Part-time']);

function validId(value) {
  return /^[1-9]\d*$/.test(value) && Number(value) <= 4294967295;
}

function validateEmployee(body = {}) {
  const employeeName = typeof body.employee_name === 'string' ? body.employee_name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  const employmentType = typeof body.employment_type === 'string' ? body.employment_type.trim() : '';

  if (!employeeName || employeeName.length > 100) {
    return { error: 'Employee name must contain 1–100 characters.' };
  }
  const phoneDigits = phone.replace(/\D/g, '');
  if (phone.length > 25 || !/^\+?[0-9 ()-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return { error: 'Please enter a valid phone number (7–15 digits).' };
  }
  if (!statuses.has(status)) return { error: 'Please select a valid employee status.' };
  if (!employmentTypes.has(employmentType)) return { error: 'Please select a valid employment type.' };

  return { employee: { employee_name: employeeName, phone, status, employment_type: employmentType } };
}

function handleWriteError(error, res, next) {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: { code: 'EMPLOYEE_PHONE_EXISTS', message: 'An employee with this phone number already exists.' },
    });
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      error: { code: 'EMPLOYEE_IN_USE', message: 'This employee is assigned to a shift and cannot be deleted.' },
    });
  }
  next(error);
}

async function listEmployees(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ data: await employees.list() });
  } catch (error) {
    next(error);
  }
}

async function getEmployee(req, res, next) {
  if (!validId(req.params.employeeId)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid employee ID.' } });
  }
  try {
    const employee = await employees.findById(Number(req.params.employeeId));
    if (!employee) return res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found.' } });
    res.json({ data: employee });
  } catch (error) {
    next(error);
  }
}

async function createEmployee(req, res, next) {
  const { employee, error } = validateEmployee(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    res.status(201).json({ data: await employees.create(employee) });
  } catch (writeError) {
    handleWriteError(writeError, res, next);
  }
}

async function updateEmployee(req, res, next) {
  if (!validId(req.params.employeeId)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid employee ID.' } });
  }
  const { employee, error } = validateEmployee(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    const updated = await employees.update(Number(req.params.employeeId), employee);
    if (!updated) return res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found.' } });
    res.json({ data: updated });
  } catch (writeError) {
    handleWriteError(writeError, res, next);
  }
}

async function deleteEmployee(req, res, next) {
  if (!validId(req.params.employeeId)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid employee ID.' } });
  }
  try {
    if (!await employees.remove(Number(req.params.employeeId))) {
      return res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found.' } });
    }
    res.status(204).end();
  } catch (writeError) {
    handleWriteError(writeError, res, next);
  }
}

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  validateEmployee,
};
