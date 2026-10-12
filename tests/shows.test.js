const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');
const app = require('../src/app');
const db = require('../src/config/db');

let server;
let baseURL;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseURL = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  await db.end();
});

test('shows API returns database fields, real booking capacity and local date/time strings', async t => {
  const databaseRows = [{ show_id: 7, artist_id: 3, artist_name: 'Example Trio', artist_type: 'group', genre: 'Jazz', performance_date: '2026-10-16', start_time: '20:30', end_time: '22:30', reservation_count: '3', reserved_seats: '24', total_tables: '12', total_capacity: '83' }];
  t.mock.method(db, 'execute', async sql => {
    assert.match(sql, /JOIN artists/);
    assert.match(sql, /DATE_FORMAT\(s\.performance_date, '%Y-%m-%d'\)/);
    assert.match(sql, /TIME_FORMAT\(s\.end_time, '%H:%i'\)/);
    assert.match(sql, /ORDER BY s\.performance_date, s\.start_time, s\.show_id/);
    return [databaseRows];
  });
  const response = await fetch(`${baseURL}/api/shows`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data: [{ ...databaseRows[0], show_id: 7, artist_id: 3, reservation_count: 3, reserved_seats: 24, total_tables: 12, total_capacity: 83 }] });
});

test('shows API supports an empty database without returning sample data', async t => {
  t.mock.method(db, 'execute', async () => [[]]);
  const response = await fetch(`${baseURL}/api/shows`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [] });
});

test('shows database failure returns an error without leaking connection details', async t => {
  t.mock.method(db, 'execute', async () => { throw new Error('private DB connection'); });
  const response = await fetch(`${baseURL}/api/shows`);
  assert.equal(response.status, 500);
  const result = await response.json();
  assert.equal(result.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(result), /private DB/);
});

test('show page, page script and stylesheet are served', async () => {
  for (const path of ['/show.html', '/js/pages/show.js', '/css/show.css']) {
    assert.equal((await fetch(`${baseURL}${path}`)).status, 200, path);
  }
});

test('show details look up a bound ID and return the selected SQL row', async t => {
  const show = { show_id: 2, artist_id: 2, artist_name: 'Midnight Blue Trio', artist_type: 'group', genre: 'Bebop & Standards', performance_date: '2026-10-17', start_time: '21:00', end_time: '23:00', reservation_count: '2', reserved_seats: '20', total_tables: '12', total_capacity: '83' };
  t.mock.method(db, 'execute', async (sql, values) => {
    assert.match(sql, /FROM shows s/);
    assert.match(sql, /JOIN artists/);
    assert.match(sql, /WHERE s\.show_id = \?/);
    assert.deepEqual(values, [2]);
    return [[show]];
  });
  const response = await fetch(`${baseURL}/api/shows/2`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data: { ...show, show_id: 2, artist_id: 2, reservation_count: 2, reserved_seats: 20, total_tables: 12, total_capacity: 83 } });
});

test('invalid show IDs never reach MySQL', async t => {
  const query = t.mock.method(db, 'execute', async () => assert.fail('Invalid ID queried'));
  for (const id of ['0', '-1', 'abc', '2.5', '4294967296', '2%20OR%201=1']) {
    assert.equal((await fetch(`${baseURL}/api/shows/${id}`)).status, 400, id);
  }
  assert.equal(query.mock.callCount(), 0);
});

test('missing show returns 404 instead of a default show', async t => {
  t.mock.method(db, 'execute', async () => [[]]);
  const response = await fetch(`${baseURL}/api/shows/999`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, 'SHOW_NOT_FOUND');
});

test('show details report database failure safely', async t => {
  t.mock.method(db, 'execute', async () => { throw new Error('private connection'); });
  const response = await fetch(`${baseURL}/api/shows/2`);
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /private connection/);
});

const validShow = {
  artist_name: 'API Test Quartet', artist_type: 'group', genre: 'Modern Jazz',
  performance_date: '2026-11-01', start_time: '20:30', end_time: '22:30',
};

function write(method, path, body) {
  return fetch(`${baseURL}${path}`, {
    method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('show mutations validate approved start times before MySQL', async t => {
  const query = t.mock.method(db, 'getConnection', async () => assert.fail('Invalid show reached MySQL'));
  for (const body of [
    { ...validShow, start_time: '19:00' },
    { ...validShow, end_time: '20:00' },
    { ...validShow, artist_type: 'band' },
  ]) {
    assert.equal((await write('POST', '/api/shows', body)).status, 400);
  }
  assert.equal(query.mock.callCount(), 0);
});

test('POST show saves its artist and show in one transaction', async t => {
  const calls = [];
  const saved = { show_id: 9, artist_id: 4, ...validShow, reservation_count: '0', reserved_seats: '0', total_tables: '12', total_capacity: '83' };
  const connection = {
    beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'), release: () => calls.push('release'),
    execute: async (sql, values) => {
      calls.push([sql, values]);
      if (sql.includes('SELECT artist_id FROM artists')) return [[]];
      if (sql.includes('INSERT INTO artists')) return [{ insertId: 4 }];
      if (sql.includes('INSERT INTO shows')) return [{ insertId: 9 }];
      if (sql.includes('FROM shows s')) return [[saved]];
      throw new Error(sql);
    },
  };
  t.mock.method(db, 'getConnection', async () => connection);
  const response = await write('POST', '/api/shows', validShow);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.total_capacity, 83);
  assert.ok(calls.includes('commit'));
});

test('PUT show updates its slot and synchronizes reservation and shift dates', async t => {
  const statements = [];
  const saved = { show_id: 9, artist_id: 4, ...validShow, reservation_count: 0, reserved_seats: 0, total_tables: 12, total_capacity: 83 };
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    execute: async (sql) => {
      statements.push(sql);
      if (sql.includes('SELECT show_id FROM shows')) return [[{ show_id: 9 }]];
      if (sql.includes('SELECT artist_id FROM artists')) return [[{ artist_id: 4 }]];
      if (sql.includes('FROM shows s')) return [[saved]];
      return [{ affectedRows: 1 }];
    },
  };
  t.mock.method(db, 'getConnection', async () => connection);
  const response = await write('PUT', '/api/shows/9', validShow);
  assert.equal(response.status, 200);
  assert.ok(statements.some(sql => sql.includes('UPDATE reservations SET date_time')));
  assert.ok(statements.some(sql => sql.includes('UPDATE employee_shifts SET shift_date')));
});

test('DELETE show uses a bound ID and reports shows that are still referenced', async t => {
  const execute = t.mock.method(db, 'execute', async (sql, values) => {
    assert.match(sql, /DELETE FROM shows WHERE show_id = \?/);
    assert.deepEqual(values, [9]);
    return [{ affectedRows: 1 }];
  });
  assert.equal((await fetch(`${baseURL}/api/shows/9`, { method: 'DELETE' })).status, 204);
  assert.equal(execute.mock.callCount(), 1);

  execute.mock.restore();
  t.mock.method(db, 'execute', async () => { throw Object.assign(new Error('referenced'), { code: 'ER_ROW_IS_REFERENCED_2' }); });
  const referenced = await fetch(`${baseURL}/api/shows/9`, { method: 'DELETE' });
  assert.equal(referenced.status, 409);
  assert.equal((await referenced.json()).error.code, 'SHOW_IN_USE');
});

test('admin shows page uses database CRUD and contains no fake 86 / 110 count', async () => {
  const html = await (await fetch(`${baseURL}/admin/shows.html`)).text();
  const script = await (await fetch(`${baseURL}/js/pages/admin-shows.js`)).text();
  assert.match(html, /id="adminShowsList"/);
  assert.doesNotMatch(html, /86\s*\/\s*110/);
  assert.match(script, /reserved_seats/);
  assert.match(script, /method: editingId \? 'PUT' : 'POST'/);
  assert.match(script, /method: 'DELETE'/);
});
