const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Small DOM stand-in for exercising submission behavior without a browser dependency.
function page(fetch, availability = async date => ({ ok: true, json: async () => ({ data: { date, booked_tables: [] } }) })) {
  function element(value = '') {
    const classes = new Set();
    return {
      value, textContent: '', hidden: true, disabled: false, dataset: {}, handlers: {},
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      addEventListener(name, handler) { this.handlers[name] = handler; },
      setAttribute(name, value) { this[name] = value; },
    };
  }
  const ids = Object.fromEntries([
    'reservationForm', 'reservationError', 'confirmationCard', 'selectedTableTitle', 'selectedTableSub',
    'guestName', 'phoneNumber', 'resDate', 'resTime', 'confirmName', 'confirmDate', 'confirmTime', 'confirmTable',
    'availabilityStatus', 'retryAvailability',
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
  let ready;
  const document = {
    getElementById: id => ids[id],
    querySelector: () => table.classList.contains('selected') ? table : null,
    querySelectorAll: () => [table],
    addEventListener: (event, handler) => { ready = handler(); },
  };
  const context = vm.createContext({ document, fetch: (url, options) => url.startsWith('/api/reservations/availability')
    ? availability(new URL(url, 'http://localhost').searchParams.get('date')) : fetch(url, options) });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/pages/reserve.js'), 'utf8'), context);
  return { ids, button, table, ready, close: () => context.closeConfirmation(), submit: () => ids.reservationForm.handlers.submit({ preventDefault() {} }) };
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
  await ui.ready;
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
    await ui.ready;
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
  await ui.ready;
  await ui.submit();
  assert.equal(ui.ids.reservationError.hidden, false);
  assert.equal(ui.ids.confirmationCard.classList.contains('hidden'), true);
});

const availabilityResult = (date, tables) => ({ ok: true, json: async () => ({ data: { date, booked_tables: tables } }) });

test('booked tables are disabled for the selected day and available on another day', async () => {
  const ui = page(async () => assert.fail('Booked tables cannot be submitted'), async date =>
    availabilityResult(date, date === '2026-12-09' ? ['F01'] : []));
  await ui.ready;
  assert.equal(ui.table.classList.contains('booked'), true);
  assert.equal(ui.table['aria-disabled'], 'true');
  ui.table.handlers.click();
  assert.equal(ui.table.classList.contains('selected'), false);
  ui.ids.resDate.value = '2026-10-16';
  await ui.ids.resDate.handlers.change();
  assert.equal(ui.table.classList.contains('booked'), false);
  ui.table.handlers.click();
  assert.equal(ui.table.classList.contains('selected'), true);
  ui.ids.resDate.value = '2026-12-09';
  await ui.ids.resDate.handlers.change();
  assert.equal(ui.table.classList.contains('selected'), false);
  assert.equal(ui.table.classList.contains('booked'), true);
});

test('late availability responses cannot overwrite the most recently selected day', async () => {
  const pending = new Map();
  const ui = page(async () => {}, date => new Promise(resolve => pending.set(date, resolve)));
  assert.equal(ui.button.disabled, true);
  ui.table.handlers.click();
  assert.equal(ui.table.classList.contains('selected'), false);
  ui.ids.resDate.value = '2026-10-16';
  const changed = ui.ids.resDate.handlers.change();
  pending.get('2026-10-16')(availabilityResult('2026-10-16', ['F01']));
  await changed;
  pending.get('2026-12-09')(availabilityResult('2026-12-09', []));
  await ui.ready;
  assert.equal(ui.table.classList.contains('booked'), true);
  assert.equal(ui.ids.resDate.value, '2026-10-16');
});

test('failed availability blocks booking until retry succeeds', async () => {
  let failing = true;
  const ui = page(async () => assert.fail('No booking while availability is unknown'), async date => {
    if (failing) throw new Error('Offline');
    return availabilityResult(date, []);
  });
  await ui.ready;
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.ids.retryAvailability.hidden, false);
  ui.table.handlers.click();
  await ui.submit();
  assert.equal(ui.table.classList.contains('selected'), false);
  failing = false;
  await ui.ids.retryAvailability.handlers.click();
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.ids.retryAvailability.hidden, true);
});

test('a booking conflict refreshes the floor plan and does not confirm', async () => {
  let checks = 0;
  const ui = page(async () => ({ ok: false, status: 409, json: async () => ({ error: { message: 'Already booked' } }) }),
    async date => availabilityResult(date, ++checks > 1 ? ['F01'] : []));
  await ui.ready;
  ui.table.handlers.click();
  await ui.submit();
  assert.equal(ui.table.classList.contains('booked'), true);
  assert.equal(ui.table.classList.contains('selected'), false);
  assert.equal(ui.ids.confirmationCard.classList.contains('hidden'), true);
  assert.equal(ui.ids.reservationError.textContent, 'Already booked');
});

test('successful booking and closing the pass keep the chosen date and reload its availability', async () => {
  let saved = false;
  const ui = page(async (url, options) => {
    saved = true;
    return { ok: true, json: async () => ({ data: { id: 1, ...JSON.parse(options.body) } }) };
  }, async date => availabilityResult(date, saved ? ['F01'] : []));
  await ui.ready;
  ui.ids.resDate.value = '2026-10-16';
  await ui.ids.resDate.handlers.change();
  ui.table.handlers.click();
  await ui.submit();
  assert.equal(ui.table.classList.contains('booked'), true);
  await ui.close();
  assert.equal(ui.ids.resDate.value, '2026-10-16');
  assert.equal(ui.table.classList.contains('booked'), true);
  assert.equal(ui.ids.confirmationCard.classList.contains('hidden'), true);
});
