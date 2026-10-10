const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');
const app = require('../src/app');
const db = require('../src/config/db');

let server;
let baseURL;
const valid = {
  employee_name: 'Mali Prasert',
  phone: '081-555-0142',
  status: 'Active',
  employment_type: 'Full-time',
};

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await db.end();
});

function write(method, path, body) {
  return fetch(`${baseURL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('GET employees returns ERD fields from MySQL', async t => {
  const data = [{ employee_id: 1, ...valid }];
  t.mock.method(db, 'execute', async sql => {
    assert.match(sql, /SELECT employee_id, employee_name, phone, status, employment_type FROM employees/);
    return [data];
  });
  const response = await fetch(`${baseURL}/api/employees`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data });
});

test('GET employee validates IDs and returns a matching row', async t => {
  const data = { employee_id: 4, ...valid };
  const execute = t.mock.method(db, 'execute', async (sql, values) => {
    assert.match(sql, /WHERE employee_id = \?/);
    assert.deepEqual(values, [4]);
    return [[data]];
  });
  assert.equal((await fetch(`${baseURL}/api/employees/not-an-id`)).status, 400);
  const response = await fetch(`${baseURL}/api/employees/4`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data });
  assert.equal(execute.mock.callCount(), 1);
});

test('POST validates every employee ERD field before writing', async t => {
  const execute = t.mock.method(db, 'execute', async () => assert.fail('Invalid employees must not be written'));
  const invalid = [
    {},
    { ...valid, employee_name: ' ' },
    { ...valid, employee_name: 'x'.repeat(101) },
    { ...valid, phone: 'abc' },
    { ...valid, status: 'Vacation' },
    { ...valid, employment_type: 'Contractor' },
  ];
  for (const employee of invalid) {
    const response = await write('POST', '/api/employees', employee);
    assert.equal(response.status, 400, JSON.stringify(employee));
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal(execute.mock.callCount(), 0);
});

test('POST creates an employee using bound parameters', async t => {
  t.mock.method(db, 'execute', async (sql, values) => {
    assert.match(sql, /^INSERT INTO employees/);
    assert.deepEqual(values, ['Mali Prasert', '081-555-0142', 'Active', 'Full-time']);
    return [{ insertId: 8 }];
  });
  const response = await write('POST', '/api/employees', { ...valid, employee_name: ` ${valid.employee_name} ` });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { employee_id: 8, ...valid } });
});

test('PUT updates and DELETE removes an employee', async t => {
  let calls = 0;
  t.mock.method(db, 'execute', async (sql, values) => {
    calls++;
    if (sql.startsWith('UPDATE')) {
      assert.deepEqual(values, ['Mali Prasert', '081-555-0142', 'Active', 'Full-time', 8]);
      return [{ affectedRows: 1 }];
    }
    assert.equal(sql, 'DELETE FROM employees WHERE employee_id = ?');
    assert.deepEqual(values, [8]);
    return [{ affectedRows: 1 }];
  });
  assert.equal((await write('PUT', '/api/employees/8', valid)).status, 200);
  assert.equal((await fetch(`${baseURL}/api/employees/8`, { method: 'DELETE' })).status, 204);
  assert.equal(calls, 2);
});

test('employee mutations report duplicates, missing rows and invalid IDs', async t => {
  const execute = t.mock.method(db, 'execute', async () => {
    throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
  });
  const duplicate = await write('POST', '/api/employees', valid);
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.code, 'EMPLOYEE_PHONE_EXISTS');
  for (const id of ['0', '-1', 'x', '4294967296']) {
    assert.equal((await write('PUT', `/api/employees/${id}`, valid)).status, 400);
    assert.equal((await fetch(`${baseURL}/api/employees/${id}`, { method: 'DELETE' })).status, 400);
  }
  assert.equal(execute.mock.callCount(), 1);
  execute.mock.mockImplementation(async () => [{ affectedRows: 0 }]);
  assert.equal((await write('PUT', '/api/employees/99', valid)).status, 404);
  assert.equal((await fetch(`${baseURL}/api/employees/99`, { method: 'DELETE' })).status, 404);
});

test('employee page has one dialog and uses the database script', async () => {
  const response = await fetch(`${baseURL}/admin/employees.html`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.equal((html.match(/id="employeeDialog"/g) || []).length, 1);
  assert.match(html, /id="employeeRows"/);
  assert.match(html, /src="\/js\/pages\/admin-employees\.js"/);
  assert.doesNotMatch(html, /UPCOMING SHIFT|roleFilter/);
});
