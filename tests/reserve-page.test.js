const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Small DOM stand-in for exercising submission behavior without a browser dependency.
function page(fetch) {
  function element(value = '') {
    const classes = new Set();
    return {
      value, textContent: '', hidden: true, disabled: false, dataset: {}, handlers: {},
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      addEventListener(name, handler) { this.handlers[name] = handler; },
    };
  }
  const ids = Object.fromEntries([
    'reservationForm', 'reservationError', 'confirmationCard', 'selectedTableTitle', 'selectedTableSub',
    'guestName', 'phoneNumber', 'resDate', 'resTime', 'confirmName', 'confirmDate', 'confirmTime', 'confirmTable',
  ].map(id => [id, element()]));
  const button = element();
  button.textContent = 'Confirm reservation request';
  ids.reservationForm.querySelector = () => button;
  ids.reservationForm.reset = () => {};
  ids.confirmationCard.classList.add('hidden');
  ids.guestName.value = 'Example Guest';
  ids.phoneNumber.value = '0812345678';
  ids.resDate.value = '2026-12-09';
  ids.resTime.value = '20:30';
  const table = element();
  table.dataset = { code: 'F01', zone: 'Front Stage', seats: '8' };
  const document = {
    getElementById: id => ids[id],
    querySelector: () => table.classList.contains('selected') ? table : null,
    querySelectorAll: () => [table],
    addEventListener: (event, handler) => handler(),
  };
  const context = vm.createContext({ document, fetch });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/pages/reserve.js'), 'utf8'), context);
  return { ids, button, table, submit: () => ids.reservationForm.handlers.submit({ preventDefault() {} }) };
}

test('sends the actual phone field and confirms only after the server saves', async () => {
  let complete;
  let calls = 0;
  const ui = page(async (url, options) => {
    calls++;
    assert.equal(url, '/api/reservations');
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload, {
      guest_name: 'Example Guest', phone_number: '0812345678', zone: 'Front Stage',
      table_number: 'F01', date: '2026-12-09', time: '20:30',
    });
    await new Promise(resolve => { complete = resolve; });
    return { ok: true, json: async () => ({ data: { id: 1, ...payload } }) };
  });
  ui.table.handlers.click();
  const pending = ui.submit();
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.ids.confirmationCard.classList.contains('hidden'), true);
  await ui.submit();
  assert.equal(calls, 1);
  complete();
  await pending;
  assert.equal(ui.ids.confirmationCard.classList.contains('hidden'), false);
  assert.equal(ui.ids.confirmTable.textContent, 'F01 (Front Stage)');
  assert.equal(ui.button.disabled, false);
  await ui.submit();
  assert.equal(calls, 1);
});

test('HTTP errors and network failures keep confirmation hidden and allow retry', async () => {
  for (const fetch of [
    async () => ({ ok: false, json: async () => ({ error: { message: 'Save failed' } }) }),
    async () => { throw new Error('Connection failed'); },
  ]) {
    const ui = page(fetch);
    ui.table.handlers.click();
    await ui.submit();
    assert.equal(ui.ids.confirmationCard.classList.contains('hidden'), true);
    assert.equal(ui.ids.reservationError.hidden, false);
    assert.ok(ui.ids.reservationError.textContent);
    assert.equal(ui.ids.guestName.value, 'Example Guest');
    assert.equal(ui.button.disabled, false);
  }
});

test('requires a table before sending a reservation', async () => {
  const ui = page(async () => { assert.fail('No request should be sent'); });
  await ui.submit();
  assert.equal(ui.ids.reservationError.hidden, false);
  assert.equal(ui.ids.confirmationCard.classList.contains('hidden'), true);
});
