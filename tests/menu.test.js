const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');
const app = require('../src/app');
const db = require('../src/config/db');

let server;
let baseURL;

const valid = {
  item_name: 'Garnet Negroni',
  category: 'recommended',
  price: '14.00',
  stock_quantity: 20,
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

test('guest menu returns only in-stock database items with ERD fields normalized', async t => {
  const rows = [{ item_id: 1, ...valid, price: '14.0000', stock_quantity: '20' }];
  t.mock.method(db, 'execute', async sql => {
    assert.match(sql, /FROM menu_items/);
    assert.match(sql, /WHERE stock_quantity > 0/);
    return [rows];
  });
  const response = await fetch(`${baseURL}/api/menu-items`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data: [{ ...rows[0], price: '14.00', stock_quantity: 20 }] });
});

test('admin menu returns in-stock and out-of-stock items', async t => {
  const rows = [
    { item_id: 1, ...valid, price: '14.00', stock_quantity: 20 },
    { item_id: 2, ...valid, item_name: 'Sold out drink', price: '10.00', stock_quantity: 0 },
  ];
  t.mock.method(db, 'execute', async sql => {
    assert.match(sql, /FROM menu_items/);
    assert.doesNotMatch(sql, /WHERE stock_quantity/);
    return [rows];
  });
  const response = await fetch(`${baseURL}/api/admin/menu-items`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.length, 2);
});

test('POST validates all menu fields before writing', async t => {
  const execute = t.mock.method(db, 'execute', async () => assert.fail('Invalid menu item must not be written'));
  const invalidItems = [
    {},
    { ...valid, item_name: ' ' },
    { ...valid, category: 'breakfast' },
    { ...valid, price: '0' },
    { ...valid, price: '10.999' },
    { ...valid, stock_quantity: '-1' },
    { ...valid, stock_quantity: '1.5' },
    { ...valid, stock_quantity: 'many' },
  ];
  for (const item of invalidItems) {
    const response = await write('POST', '/api/menu-items', item);
    assert.equal(response.status, 400, JSON.stringify(item));
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal(execute.mock.callCount(), 0);
});

test('POST creates a menu item using bound parameters', async t => {
  t.mock.method(db, 'execute', async (sql, values) => {
    assert.match(sql, /^INSERT INTO menu_items/);
    assert.deepEqual(values, ['Garnet Negroni', 'recommended', '14.00', 20]);
    return [{ insertId: 12 }];
  });
  const response = await write('POST', '/api/menu-items', { ...valid, item_name: ` ${valid.item_name} ` });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { item_id: 12, ...valid } });
});

test('PUT updates an existing item and DELETE removes it', async t => {
  let call = 0;
  t.mock.method(db, 'execute', async (sql, values) => {
    call++;
    if (sql.startsWith('UPDATE')) {
      assert.deepEqual(values, ['Garnet Negroni', 'recommended', '14.00', 20, 7]);
      return [{ affectedRows: 1 }];
    }
    assert.equal(sql, 'DELETE FROM menu_items WHERE item_id = ?');
    assert.deepEqual(values, [7]);
    return [{ affectedRows: 1 }];
  });
  const updated = await write('PUT', '/api/menu-items/7', valid);
  assert.equal(updated.status, 200);
  assert.deepEqual(await updated.json(), { data: { item_id: 7, ...valid } });
  const removed = await fetch(`${baseURL}/api/menu-items/7`, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.equal(call, 2);
});

test('menu mutations handle duplicate names, missing rows and invalid IDs', async t => {
  const execute = t.mock.method(db, 'execute', async () => {
    throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
  });
  const duplicate = await write('POST', '/api/menu-items', valid);
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.code, 'MENU_ITEM_EXISTS');
  for (const id of ['0', '-1', 'x', '4294967296']) {
    assert.equal((await write('PUT', `/api/menu-items/${id}`, valid)).status, 400);
    assert.equal((await fetch(`${baseURL}/api/menu-items/${id}`, { method: 'DELETE' })).status, 400);
  }
  assert.equal(execute.mock.callCount(), 1);

  execute.mock.mockImplementation(async () => [{ affectedRows: 0 }]);
  assert.equal((await write('PUT', '/api/menu-items/99', valid)).status, 404);
  assert.equal((await fetch(`${baseURL}/api/menu-items/99`, { method: 'DELETE' })).status, 404);
});

test('guest and admin menu pages and assets are served', async () => {
  for (const path of ['/menu.html', '/admin/menu.html', '/js/pages/menu.js', '/js/pages/admin-menu.js', '/css/menu.css', '/css/admin/menu.css']) {
    const response = await fetch(`${baseURL}${path}`);
    assert.equal(response.status, 200, path);
    if (path === '/menu.html') {
      const html = await response.text();
      for (const category of ['recommended', 'seasonal', 'cocktail', 'liquor', 'dessert', 'appetizer']) {
        assert.match(html, new RegExp(`data-category="${category}"`));
      }
      assert.match(html, /src="\/js\/pages\/menu.js"/);
    }
  }
});
