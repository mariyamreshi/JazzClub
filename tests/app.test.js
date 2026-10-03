const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');
const app = require('../src/app');
const db = require('../src/config/db');
const healthModel = require('../src/models/health.model');

let server;
let baseURL;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await db.end();
});

test('home route serves the HTML view', async () => {
  const response = await fetch(baseURL);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(await response.text(), /Jazz Club Management System/);
});

test('server health does not need a database connection', async () => {
  const response = await fetch(`${baseURL}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { server: 'ok' } });
});

test('public assets are served', async () => {
  const response = await fetch(`${baseURL}/js/api.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /javascript/);
});

test('private files and unknown paths are not exposed', async () => {
  for (const path of ['/.env', '/src/config/db.js', '/package.json', '/missing']) {
    const response = await fetch(`${baseURL}${path}`);
    assert.equal(response.status, 404, path);
    assert.equal((await response.json()).error.code, 'NOT_FOUND');
  }
});

test('malformed JSON returns a controlled error', async () => {
  const response = await fetch(`${baseURL}/api/health`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
});

test('database health reports success when the model check succeeds', async (t) => {
  t.mock.method(healthModel, 'checkConnection', async () => true);
  const response = await fetch(`${baseURL}/api/health/db`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { database: 'ok' } });
});

test('database health returns 503 without exposing connection errors', async (t) => {
  t.mock.method(healthModel, 'checkConnection', async () => {
    throw new Error('sensitive connection details');
  });
  const response = await fetch(`${baseURL}/api/health/db`);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, 'DATABASE_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(body), /sensitive connection details/);
});
