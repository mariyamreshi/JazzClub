const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../src/app');
const db = require('../src/config/db');

let server;
let baseURL;
const valid = {
  employee_id: 1,
  show_id: 2,
  role: 'Bartender',
  shift_date: '2026-10-17',
  start_time: '19:00',
  end_time: '23:30',
};
const saved = {
  shift_id: 9,
  employee_id: 1,
  employee_name: 'Fifa',
  show_id: 2,
  artist_name: 'Midnight Blue Trio',
  role: 'Bartender',
  shift_date: '2026-10-17',
  start_time: '19:00',
  end_time: '23:30',
  performance_date: '2026-10-17',
  show_start_time: '21:00',
  show_end_time: '23:00',
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

function write(method, route, body) {
  return fetch(`${baseURL}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function connectionForSave({ update = false, overlap = false, active = true, showDate = valid.shift_date } = {}) {
  return {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql, values) => {
      if (sql.startsWith('SELECT shift_id FROM employee_shifts WHERE shift_id')) return [[{ shift_id: 9 }]];
      if (sql.startsWith('SELECT employee_id, status FROM employees')) return [[{ employee_id: 1, status: active ? 'Active' : 'On leave' }]];
      if (sql.includes('FROM shows WHERE show_id')) return [[{ show_id: 2, performance_date: showDate }]];
      if (sql.startsWith('SELECT shift_id FROM employee_shifts\n')) return [overlap ? [{ shift_id: 3 }] : []];
      if (sql.includes('INSERT INTO employee_shifts')) {
        assert.deepEqual(values, [1, 2, 'Bartender', '2026-10-17', '19:00', '23:30']);
        return [{ insertId: 9 }];
      }
      if (sql.includes('UPDATE employee_shifts')) {
        assert.equal(update, true);
        assert.deepEqual(values, [1, 2, 'Bartender', '2026-10-17', '19:00', '23:30', 9]);
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('JOIN employees') && sql.includes('WHERE es.shift_id')) return [[saved]];
      assert.fail(`Unexpected SQL: ${sql}`);
    },
  };
}

test('GET employee shifts returns the EMPLOYEE_SHIFT fields and joined labels', async t => {
  const execute = t.mock.method(db, 'execute', async (sql, values) => {
    assert.match(sql, /FROM employee_shifts es/);
    assert.match(sql, /JOIN employees/);
    assert.match(sql, /JOIN shows/);
    assert.deepEqual(values, ['2026-10-12', '2026-10-18']);
    return [[{ ...saved, shift_id: '9', employee_id: '1', show_id: '2' }]];
  });
  const response = await fetch(`${baseURL}/api/employee-shifts?from=2026-10-12&to=2026-10-18`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data: [saved] });
  assert.equal(execute.mock.callCount(), 1);
});

test('shift endpoints reject invalid ERD fields and invalid IDs before MySQL', async t => {
  const getConnection = t.mock.method(db, 'getConnection', async () => assert.fail('Invalid shift must not open a transaction'));
  const invalid = [
    {},
    { ...valid, employee_id: 0 },
    { ...valid, show_id: 'x' },
    { ...valid, role: ' ' },
    { ...valid, role: 'x'.repeat(61) },
    { ...valid, shift_date: '2026-02-31' },
    { ...valid, start_time: '24:00' },
    { ...valid, start_time: '23:30', end_time: '19:00' },
  ];
  for (const shift of invalid) {
    const response = await write('POST', '/api/employee-shifts', shift);
    assert.equal(response.status, 400, JSON.stringify(shift));
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal((await fetch(`${baseURL}/api/employee-shifts?from=bad&to=2026-10-18`)).status, 400);
  assert.equal((await write('PUT', '/api/employee-shifts/nope', valid)).status, 400);
  assert.equal(getConnection.mock.callCount(), 0);
});

test('POST shift validates references and saves all ERD fields in one transaction', async t => {
  const connection = connectionForSave();
  const getConnection = t.mock.method(db, 'getConnection', async () => connection);
  const response = await write('POST', '/api/employee-shifts', { ...valid, role: ' Bartender ' });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: saved });
  assert.equal(getConnection.mock.callCount(), 1);
});

test('PUT edits a shift and DELETE removes only the selected assignment', async t => {
  t.mock.method(db, 'getConnection', async () => connectionForSave({ update: true }));
  const update = await write('PUT', '/api/employee-shifts/9', valid);
  assert.equal(update.status, 200);
  assert.deepEqual(await update.json(), { data: saved });

  const execute = t.mock.method(db, 'execute', async (sql, values) => {
    assert.equal(sql, 'DELETE FROM employee_shifts WHERE shift_id = ?');
    assert.deepEqual(values, [9]);
    return [{ affectedRows: 1 }];
  });
  assert.equal((await fetch(`${baseURL}/api/employee-shifts/9`, { method: 'DELETE' })).status, 204);
  assert.equal(execute.mock.callCount(), 1);
});

test('shift API rejects inactive employees, mismatched show dates and overlapping shifts', async t => {
  const cases = [
    [{ active: false }, 'EMPLOYEE_NOT_ACTIVE'],
    [{ showDate: '2026-10-18' }, 'SHIFT_DATE_MISMATCH'],
    [{ overlap: true }, 'SHIFT_OVERLAP'],
  ];
  for (const [settings, code] of cases) {
    t.mock.method(db, 'getConnection', async () => connectionForSave(settings));
    const response = await write('POST', '/api/employee-shifts', valid);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, code);
    db.getConnection.mock.restore();
  }
});

test('admin shift page exposes ERD fields and database CRUD without staffing targets', async () => {
  const response = await fetch(`${baseURL}/admin/shifts.html`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const script = fs.readFileSync(path.join(__dirname, '../public/js/pages/admin-shifts.js'), 'utf8');
  for (const id of ['shiftEmployee', 'shiftShow', 'shiftRole', 'shiftDate', 'shiftStart', 'shiftEnd']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="scheduleGrid"/);
  assert.match(script, /\/api\/employee-shifts/);
  assert.match(script, /editingId === null \? 'POST' : 'PUT'/);
  assert.match(script, /method: 'DELETE'/);
  assert.doesNotMatch(html + script, /roleTarget|employee-role-targets|target not set|schedule-settings/i);
  assert.match(script, /schedule-show-warning/);
  assert.match(script, /has no employee shifts/);
});
