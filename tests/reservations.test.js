const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');
const app = require('../src/app');
const db = require('../src/config/db');

let server;
let baseURL;
const valid = {
  guest_name: "ทดสอบ O'Connor",
  phone_number: '0812345678',
  zone: 'Front Stage',
  table_number: 'F01',
  date: '2026-12-09',
  time: '20:30',
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

function submit(payload) {
  return fetch(`${baseURL}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

test('saves all six fields using bound SQL parameters and preserves a leading zero', async t => {
  const execute = t.mock.method(db, 'execute', async (sql, values) => {
    assert.match(sql, /^INSERT INTO reservations/);
    assert.equal((sql.match(/\?/g) || []).length, 6);
    assert.ok(!sql.includes(valid.guest_name));
    assert.deepEqual(values, Object.values(valid));
    return [{ insertId: 42 }];
  });
  const response = await submit({ ...valid, guest_name: ` ${valid.guest_name} ` });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { id: 42, ...valid } });
  assert.equal(execute.mock.callCount(), 1);
});

test('rejects incomplete, malformed and mismatched reservations before writing', async t => {
  const execute = t.mock.method(db, 'execute', async () => {
    throw new Error('Invalid data must not reach MySQL');
  });
  const cases = [
    {},
    { ...valid, guest_name: '   ' },
    { ...valid, guest_name: 'x'.repeat(101) },
    { ...valid, phone_number: 812345678 },
    { ...valid, phone_number: 'abc' },
    { ...valid, zone: 'Main Floor' },
    { ...valid, zone: '__proto__' },
    { ...valid, table_number: 'F99' },
    { ...valid, date: '2026-02-29' },
    { ...valid, date: '2026-04-31' },
    { ...valid, date: '09/12/2026' },
    { ...valid, time: '24:00' },
    { ...valid, time: '20:60' },
  ];
  for (const payload of cases) {
    const response = await submit(payload);
    assert.equal(response.status, 400, JSON.stringify(payload));
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal(execute.mock.callCount(), 0);
});

test('accepts a leap day, VIP table and formatted international phone number', async t => {
  t.mock.method(db, 'execute', async () => [{ insertId: 43 }]);
  const payload = { ...valid, date: '2028-02-29', zone: 'VIP Lounge', table_number: 'VIP-2', phone_number: '+66 (81) 234-5678' };
  const response = await submit(payload);
  assert.equal(response.status, 201);
  assert.deepEqual((await response.json()).data, { id: 43, ...payload });
});

test('returns an error instead of confirming when MySQL fails', async t => {
  t.mock.method(db, 'execute', async () => { throw new Error('private SQL connection details'); });
  const response = await submit(valid);
  assert.equal(response.status, 500);
  const result = await response.json();
  assert.equal(result.error.code, 'INTERNAL_ERROR');
  assert.equal(result.data, undefined);
  assert.ok(!JSON.stringify(result).includes('private SQL'));
});

test('availability lists only table codes for the requested date without guest details', async t => {
  t.mock.method(db, 'execute', async (sql, values) => {
    assert.match(sql, /SELECT table_number FROM reservations WHERE `date` = \?/);
    assert.deepEqual(values, ['2026-10-16']);
    return [[{ table_number: 'F02' }, { table_number: 'VIP-1' }]];
  });
  const response = await fetch(`${baseURL}/api/reservations/availability?date=2026-10-16`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data: { date: '2026-10-16', booked_tables: ['F02', 'VIP-1'] } });
});

test('availability rejects missing and invalid dates without querying MySQL', async t => {
  const query = t.mock.method(db, 'execute', async () => assert.fail('No query for an invalid date'));
  for (const queryString of ['', '?date=2026-02-30', '?date=2026-10-16&date=2026-10-17', '?date=16/10/2026']) {
    const response = await fetch(`${baseURL}/api/reservations/availability${queryString}`);
    assert.equal(response.status, 400);
  }
  assert.equal(query.mock.callCount(), 0);
});

test('availability returns an empty list for a day with no reservations', async t => {
  t.mock.method(db, 'execute', async () => [[]]);
  const response = await fetch(`${baseURL}/api/reservations/availability?date=2026-10-17`);
  assert.deepEqual(await response.json(), { data: { date: '2026-10-17', booked_tables: [] } });
});

test('availability does not pretend tables are free when the database is unavailable', async t => {
  t.mock.method(db, 'execute', async () => { throw new Error('private database details'); });
  const response = await fetch(`${baseURL}/api/reservations/availability?date=2026-10-16`);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).data, undefined);
});

test('duplicate table/day reservations return a conflict', async t => {
  t.mock.method(db, 'execute', async () => { throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }); });
  const response = await submit(valid);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, 'TABLE_ALREADY_BOOKED');
});
