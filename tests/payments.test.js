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

function postPayment(body) {
  return fetch(`${baseURL}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('POST payments validates order, method and amount before using MySQL', async t => {
  const getConnection = t.mock.method(db, 'getConnection', async () => assert.fail('Invalid payment must not reach MySQL'));
  for (const body of [
    {},
    { order_id: 0, payment_method: 'Cash', amount: '14.00' },
    { order_id: 1, payment_method: 'Crypto', amount: '14.00' },
    { order_id: 1, payment_method: 'Cash', amount: '0' },
    { order_id: 1, payment_method: 'Cash', amount: '14.999' },
  ]) {
    const response = await postPayment(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal(getConnection.mock.callCount(), 0);
});

test('POST payments inserts PAYMENT and marks ORDER paid in one transaction', async t => {
  const calls = [];
  let committed = false;
  let released = false;
  const connection = {
    beginTransaction: async () => {},
    execute: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('FROM orders WHERE')) return [[{ order_id: 4, table_id: 'B02', status: 'pending', total: '14.00' }]];
      if (sql.startsWith('SELECT payment_id FROM payments')) return [[]];
      if (sql.startsWith('INSERT INTO payments')) return [{ insertId: 8 }];
      if (sql.startsWith('UPDATE orders')) return [{ affectedRows: 1 }];
      if (sql.includes('FROM payments WHERE payment_id')) {
        return [[{ payment_id: 8, order_id: 4, payment_method: 'PromptPay', amount: '14.00', payment_time: '2026-10-10T21:10:00' }]];
      }
      assert.fail(sql);
    },
    commit: async () => { committed = true; },
    rollback: async () => assert.fail('Valid payment must not roll back'),
    release: () => { released = true; },
  };
  t.mock.method(db, 'getConnection', async () => connection);

  const response = await postPayment({ order_id: 4, payment_method: 'promptpay', amount: '14.00' });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: {
    payment_id: 8,
    order_id: 4,
    payment_method: 'PromptPay',
    amount: '14.00',
    payment_time: '2026-10-10T21:10:00',
    table_id: 'B02',
  } });
  assert.equal(committed, true);
  assert.equal(released, true);
  assert.deepEqual(calls[2].values, [4, 'PromptPay', '14.00']);
  assert.deepEqual(calls[3].values, [4]);
});

test('POST payments rejects a different amount and duplicate payment', async t => {
  let mode = 'amount';
  let rollbacks = 0;
  const connection = {
    beginTransaction: async () => {},
    execute: async sql => {
      if (sql.includes('FROM orders WHERE')) return [[{ order_id: 1, table_id: 'B01', status: mode === 'duplicate' ? 'paid' : 'pending', total: '14.00' }]];
      if (sql.startsWith('SELECT payment_id FROM payments')) return [mode === 'duplicate' ? [{ payment_id: 2 }] : []];
      assert.fail('Rejected payment must not be inserted');
    },
    commit: async () => assert.fail('Rejected payment must not commit'),
    rollback: async () => { rollbacks++; },
    release: () => {},
  };
  t.mock.method(db, 'getConnection', async () => connection);

  const mismatch = await postPayment({ order_id: 1, payment_method: 'Cash', amount: '13.00' });
  assert.equal(mismatch.status, 409);
  assert.equal((await mismatch.json()).error.code, 'PAYMENT_AMOUNT_MISMATCH');

  mode = 'duplicate';
  const duplicate = await postPayment({ order_id: 1, payment_method: 'Cash', amount: '14.00' });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.code, 'PAYMENT_EXISTS');
  assert.equal(rollbacks, 2);
});

test('admin order page contains database-backed payment dialog', async () => {
  const [html, script, stylesheet] = await Promise.all([
    fetch(`${baseURL}/admin/order.html`).then(response => response.text()),
    fetch(`${baseURL}/js/pages/admin-order.js`).then(response => response.text()),
    fetch(`${baseURL}/css/admin/admin-order.css`).then(response => response.text()),
  ]);
  assert.match(html, /id="paymentDialog"/);
  assert.match(html, /id="paymentMethod"/);
  assert.match(html, /id="paidAmountInput"/);
  assert.match(script, /fetch\('\/api\/payments'/);
  assert.match(stylesheet, /dialog\.payment-modal/);
});
