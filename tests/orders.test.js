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

function postOrder(body) {
  return fetch(`${baseURL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('GET tables returns available table IDs for the order popup', async t => {
  t.mock.method(db, 'execute', async sql => {
    assert.match(sql, /FROM club_tables/);
    assert.match(sql, /status = 'available'/);
    return [[{ table_id: 'F01', capacity: '8', zone: 'Front Stage' }]];
  });
  const response = await fetch(`${baseURL}/api/tables`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    data: [{ table_id: 'F01', capacity: 8, zone: 'Front Stage' }],
  });
});

test('POST orders validates table, item and quantity before opening a transaction', async t => {
  const getConnection = t.mock.method(db, 'getConnection', async () => assert.fail('Invalid order must not reach MySQL'));
  for (const body of [
    {},
    { table_id: '../F01', item_id: 1, quantity: 1 },
    { table_id: 'F01', item_id: 0, quantity: 1 },
    { table_id: 'F01', item_id: 1, quantity: 0 },
    { table_id: 'F01', item_id: 1, quantity: 1.5 },
    { table_id: 'F01', item_id: 1, quantity: 100 },
  ]) {
    const response = await postOrder(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal(getConnection.mock.callCount(), 0);
});

test('POST orders creates ORDER and ORDER_ITEM, deducts stock and commits atomically', async t => {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  let released = false;
  const connection = {
    beginTransaction: async () => calls.push('begin'),
    execute: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('FROM club_tables')) return [[{ table_id: 'F01', status: 'available' }]];
      if (sql.includes('FROM menu_items')) {
        return [[{ item_id: 7, item_name: 'Tiramisu Delight', price: '9.50', stock_quantity: 9 }]];
      }
      if (sql.startsWith('INSERT INTO orders')) return [{ insertId: 42 }];
      if (sql.startsWith('INSERT INTO order_items')) return [{ affectedRows: 1 }];
      if (sql.startsWith('UPDATE menu_items')) return [{ affectedRows: 1 }];
      assert.fail(sql);
    },
    commit: async () => { committed = true; },
    rollback: async () => { rolledBack = true; },
    release: () => { released = true; },
  };
  t.mock.method(db, 'getConnection', async () => connection);

  const response = await postOrder({ table_id: 'f01', item_id: 7, quantity: 2 });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: {
      order_id: 42,
      table_id: 'F01',
      status: 'pending',
      total: '19.00',
      item: {
        item_id: 7,
        item_name: 'Tiramisu Delight',
        price_at_time: '9.50',
        quantity: 2,
      },
    },
  });
  assert.equal(committed, true);
  assert.equal(rolledBack, false);
  assert.equal(released, true);
  assert.deepEqual(calls[4].values, [42, 7, '9.50', 2]);
  assert.deepEqual(calls[5].values, [2, 7, 2]);
});

test('POST orders rolls back when the table is missing or stock is insufficient', async t => {
  let mode = 'missing-table';
  let rollbackCount = 0;
  let releaseCount = 0;
  const connection = {
    beginTransaction: async () => {},
    execute: async sql => {
      if (sql.includes('FROM club_tables')) {
        return [mode === 'missing-table' ? [] : [{ table_id: 'F01', status: 'available' }]];
      }
      if (sql.includes('FROM menu_items')) {
        return [[{ item_id: 7, item_name: 'Cake', price: '10.00', stock_quantity: 1 }]];
      }
      assert.fail('No INSERT or UPDATE should run after a domain error');
    },
    commit: async () => assert.fail('Failed orders must not commit'),
    rollback: async () => { rollbackCount++; },
    release: () => { releaseCount++; },
  };
  t.mock.method(db, 'getConnection', async () => connection);

  const missingTable = await postOrder({ table_id: 'X99', item_id: 7, quantity: 1 });
  assert.equal(missingTable.status, 404);
  assert.equal((await missingTable.json()).error.code, 'TABLE_NOT_FOUND');

  mode = 'low-stock';
  const insufficient = await postOrder({ table_id: 'F01', item_id: 7, quantity: 2 });
  assert.equal(insufficient.status, 409);
  assert.equal((await insufficient.json()).error.code, 'INSUFFICIENT_STOCK');
  assert.equal(rollbackCount, 2);
  assert.equal(releaseCount, 2);
});

test('guest menu includes the order popup and sends orders through the API', async () => {
  const [html, script, stylesheet] = await Promise.all([
    fetch(`${baseURL}/menu.html`).then(response => response.text()),
    fetch(`${baseURL}/js/pages/menu.js`).then(response => response.text()),
    fetch(`${baseURL}/css/menu.css`).then(response => response.text()),
  ]);
  assert.match(html, /id="orderDialog"/);
  assert.match(html, /id="orderTableId"/);
  assert.match(html, /id="orderQuantity"/);
  assert.match(script, /fetch\('\/api\/tables'/);
  assert.match(script, /fetch\('\/api\/orders'/);
  assert.match(stylesheet, /\.order-dialog/);
});
