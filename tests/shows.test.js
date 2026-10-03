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

test('shows API returns database fields as local date/time strings', async t => {
  const data = [{ show_id: 7, show_date: '2026-10-16', artist: 'Example Trio', genre: 'Jazz', start_time: '20:30' }];
  t.mock.method(db, 'execute', async sql => {
    assert.match(sql, /DATE_FORMAT\(show_date, '%Y-%m-%d'\)/);
    assert.match(sql, /TIME_FORMAT\(start_time, '%H:%i'\)/);
    assert.match(sql, /ORDER BY show_date, start_time, show_id/);
    return [data];
  });
  const response = await fetch(`${baseURL}/api/shows`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data });
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
  const show = { show_id: 2, show_date: '2026-10-17', artist: 'Midnight Blue Trio', genre: 'Bebop & Standards', start_time: '21:00' };
  t.mock.method(db, 'execute', async (sql, values) => {
    assert.match(sql, /FROM shows WHERE show_id = \?/);
    assert.deepEqual(values, [2]);
    return [[show]];
  });
  const response = await fetch(`${baseURL}/api/shows/2`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data: show });
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
