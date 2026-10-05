const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function page(fetch) {
  function element() {
    return {
      value: '', textContent: '', children: [], handlers: {}, disabled: false, open: false,
      showModal() { this.open = true; },
      close() { this.open = false; if (this.handlers.close) this.handlers.close(); },
      setAttribute(name, value) { this[name] = value; },
      appendChild(child) { this.children.push(child); },
      replaceChildren(...children) { this.children = children; },
      addEventListener(event, handler) { this.handlers[event] = handler; },
    };
  }
  const ids = Object.fromEntries([
    'reservationTableBody', 'guestSearchInput', 'reservationDateFilter', 'clearReservationFilters',
    'refreshReservations', 'reservationCount', 'reservationListStatus', 'addReservation',
    'editReservationDialog', 'deleteReservationDialog', 'editReservationForm', 'editReservationFields',
    'editReservationError', 'deleteReservationError', 'editGuestName', 'editPhoneNumber', 'editDate', 'editTime',
    'editZone', 'editTable', 'cancelReservationEdit', 'saveReservationEdit', 'cancelReservationDelete',
    'confirmReservationDelete', 'editReservationTitle', 'deleteReservationSummary',
  ].map(id => [id, element()]));
  let ready;
  let interval;
  const windowHandlers = {};
  const document = {
    hidden: false,
    getElementById: id => ids[id], createElement: element,
    addEventListener: (event, handler) => { ready = handler(); },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/pages/admin-reservations.js'), 'utf8'), { document, fetch, window: {
    addEventListener: (event, handler) => { windowHandlers[event] = handler; },
    setInterval: (handler, milliseconds) => { assert.equal(milliseconds, 10000); interval = handler; },
  } });
  return { ids, ready, document, windowHandlers, poll: () => interval() };
}

const rows = [
  { id: 12, guest_name: '<img src=x onerror=alert(1)>', phone_number: '0812345678', date: '2026-10-17', time: '20:30', zone: 'Front Stage', table_number: 'F02' },
  { id: 11, guest_name: 'Example Guest', phone_number: '0898765432', date: '2026-10-16', time: '21:00', zone: 'VIP Lounge', table_number: 'VIP-1' },
];
const result = data => ({ ok: true, json: async () => ({ data: JSON.parse(JSON.stringify(data)) }) });

test('renders database reservations safely with phone, date, time, zone and table', async () => {
  const ui = page(async (url, options) => {
    assert.equal(url, '/api/reservations');
    assert.equal(options.cache, 'no-store');
    return result(rows);
  });
  await ui.ready;
  const rendered = ui.ids.reservationTableBody.children;
  assert.equal(rendered.length, 2);
  const cells = rendered[0].children;
  assert.equal(cells[0].children[0].textContent, rows[0].guest_name);
  assert.equal(cells[0].children[1].textContent, 'R-12');
  assert.deepEqual(Array.from(cells.slice(1, 6), cell => cell.textContent), ['0812345678', '17/10/2026', '20:30', 'Front Stage', 'F02']);
  assert.equal(ui.ids.reservationCount.textContent, '2');
});

test('search and date filters combine, support phone/table/ID and can be reset', async () => {
  const ui = page(async () => result(rows));
  await ui.ready;
  for (const query of ['example', '0898765432', 'vip-1', 'VIP Lounge', 'r-11']) {
    ui.ids.guestSearchInput.value = query;
    ui.ids.guestSearchInput.handlers.input();
    assert.equal(ui.ids.reservationTableBody.children.length, 1);
    assert.equal(ui.ids.reservationTableBody.children[0].children[0].children[1].textContent, 'R-11');
  }
  ui.ids.reservationDateFilter.value = '2026-10-17';
  ui.ids.reservationDateFilter.handlers.change();
  assert.match(ui.ids.reservationTableBody.children[0].children[0].textContent, /No reservations match/);
  assert.equal(ui.ids.reservationListStatus.textContent, 'Showing 0 of 2 reservations');
  ui.ids.clearReservationFilters.handlers.click();
  assert.equal(ui.ids.reservationTableBody.children.length, 2);
  assert.equal(ui.ids.reservationCount.textContent, '2');
});

test('an empty database displays no bookings rather than mock guests', async () => {
  const ui = page(async () => result([]));
  await ui.ready;
  assert.equal(ui.ids.reservationCount.textContent, '0');
  assert.equal(ui.ids.reservationTableBody.children[0].children[0].textContent, 'No reservations yet.');
});

test('refresh retrieves new bookings and keeps the active filters', async () => {
  let calls = 0;
  const ui = page(async () => result(++calls === 1 ? rows.slice(0, 1) : rows));
  await ui.ready;
  ui.ids.reservationDateFilter.value = '2026-10-16';
  ui.ids.reservationDateFilter.handlers.change();
  await ui.ids.refreshReservations.handlers.click();
  assert.equal(ui.ids.reservationDateFilter.value, '2026-10-16');
  assert.equal(ui.ids.reservationCount.textContent, '2');
  assert.equal(ui.ids.reservationListStatus.textContent, 'Showing 1 of 2 reservations');
});

test('HTTP and network failures show an error and permit a successful retry', async () => {
  for (const fail of [async () => ({ ok: false }), async () => { throw new Error('offline'); }]) {
    let failing = true;
    const ui = page(async () => failing ? fail() : result(rows));
    await ui.ready;
    assert.equal(ui.ids.reservationCount.textContent, '—');
    assert.match(ui.ids.reservationListStatus.textContent, /Unable to load reservations/);
    assert.equal(ui.ids.refreshReservations.disabled, false);
    ui.ids.guestSearchInput.handlers.input();
    assert.match(ui.ids.reservationListStatus.textContent, /Unable to load reservations/);
    failing = false;
    await ui.ids.refreshReservations.handlers.click();
    assert.equal(ui.ids.reservationCount.textContent, '2');
  }
});

test('returning from the booking tab refreshes the same admin list', async () => {
  let calls = 0;
  const ui = page(async () => result(++calls === 1 ? [] : rows));
  await ui.ready;
  assert.equal(ui.ids.reservationCount.textContent, '0');
  await ui.windowHandlers.focus();
  assert.equal(ui.ids.reservationCount.textContent, '2');
});

test('visible admin pages automatically refresh while hidden pages do not poll', async () => {
  let calls = 0;
  const ui = page(async () => { calls++; return result(rows); });
  await ui.ready;
  ui.document.hidden = true;
  ui.poll();
  assert.equal(calls, 1);
  ui.document.hidden = false;
  ui.poll();
  assert.equal(calls, 2);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.ids.reservationCount.textContent, '2');
});

function action(ui, index) {
  return ui.ids.reservationTableBody.children[0].children[6].children[index].handlers.click();
}
const submitEvent = { preventDefault() {} };

test('Edit prefills data, preserves the draft during polling and saves all six fields', async () => {
  let stored = rows.map(row => ({ ...row }));
  let calls = 0;
  let written;
  const ui = page(async (url, options) => {
    calls++;
    if (options.method === 'PUT') {
      assert.equal(url, '/api/reservations/12');
      written = JSON.parse(options.body);
      stored[0] = { id: 12, ...written };
      return result(stored[0]);
    }
    return result(stored);
  });
  await ui.ready;
  action(ui, 0);
  assert.equal(ui.ids.editReservationDialog.open, true);
  assert.equal(ui.ids.editGuestName.value, rows[0].guest_name);
  assert.equal(ui.ids.editPhoneNumber.value, '0812345678');
  ui.ids.editGuestName.value = 'Updated Guest';
  ui.ids.editZone.value = 'Main Floor';
  ui.ids.editZone.handlers.change();
  assert.equal(ui.ids.editTable.value, 'M01');
  ui.poll();
  await ui.windowHandlers.focus();
  assert.equal(calls, 1);
  assert.equal(ui.ids.editGuestName.value, 'Updated Guest');
  await ui.ids.editReservationForm.handlers.submit(submitEvent);
  assert.deepEqual(written, { guest_name: 'Updated Guest', phone_number: '0812345678', date: rows[0].date, time: '20:30', zone: 'Main Floor', table_number: 'M01' });
  assert.equal(ui.ids.editReservationDialog.open, false);
  assert.equal(ui.ids.reservationTableBody.children[0].children[0].children[0].textContent, 'Updated Guest');
});

test('Edit conflict keeps the entered values and allows correcting the booking', async () => {
  const ui = page(async (url, options) => options.method === 'PUT'
    ? { ok: false, json: async () => ({ error: { message: 'Table already booked' } }) }
    : result(rows));
  await ui.ready;
  action(ui, 0);
  ui.ids.editGuestName.value = 'Keep this draft';
  await ui.ids.editReservationForm.handlers.submit(submitEvent);
  assert.equal(ui.ids.editReservationDialog.open, true);
  assert.equal(ui.ids.editGuestName.value, 'Keep this draft');
  assert.equal(ui.ids.editReservationError.textContent, 'Table already booked');
  assert.equal(ui.ids.saveReservationEdit.disabled, false);
});

test('Delete requires confirmation and cancel does not send a DELETE request', async () => {
  let calls = 0;
  const ui = page(async () => { calls++; return result(rows); });
  await ui.ready;
  action(ui, 1);
  assert.equal(ui.ids.deleteReservationDialog.open, true);
  assert.match(ui.ids.deleteReservationSummary.textContent, /R-12/);
  assert.equal(calls, 1);
  ui.ids.cancelReservationDelete.handlers.click();
  assert.equal(ui.ids.deleteReservationDialog.open, false);
  assert.equal(calls, 1);
});

test('confirmed Delete removes only the selected row and updates the total', async () => {
  let deleted = false;
  const ui = page(async (url, options) => {
    if (options.method === 'DELETE') {
      assert.equal(url, '/api/reservations/12');
      deleted = true;
      return { ok: true, status: 204 };
    }
    return result(deleted ? rows.slice(1) : rows);
  });
  await ui.ready;
  action(ui, 1);
  await ui.ids.confirmReservationDelete.handlers.click();
  assert.equal(ui.ids.deleteReservationDialog.open, false);
  assert.equal(ui.ids.reservationCount.textContent, '1');
  assert.equal(ui.ids.reservationTableBody.children[0].children[0].children[1].textContent, 'R-11');
});

test('failed Delete keeps the row and displays an error', async () => {
  const ui = page(async (url, options) => options.method === 'DELETE'
    ? { ok: false, json: async () => ({ error: { message: 'Unable to delete' } }) }
    : result(rows));
  await ui.ready;
  action(ui, 1);
  await ui.ids.confirmReservationDelete.handlers.click();
  assert.equal(ui.ids.deleteReservationDialog.open, true);
  assert.equal(ui.ids.deleteReservationError.textContent, 'Unable to delete');
  assert.equal(ui.ids.reservationCount.textContent, '2');
});

test('pending saves block repeated requests and prevent closing the dialog', async () => {
  let finish;
  let writes = 0;
  const ui = page(async (url, options) => {
    if (options.method === 'PUT') {
      writes++;
      await new Promise(resolve => { finish = resolve; });
      return result(rows[0]);
    }
    return result(rows);
  });
  await ui.ready;
  action(ui, 0);
  const pending = ui.ids.editReservationForm.handlers.submit(submitEvent);
  await ui.ids.editReservationForm.handlers.submit(submitEvent);
  assert.equal(writes, 1);
  assert.equal(ui.ids.saveReservationEdit.disabled, true);
  let prevented = false;
  ui.ids.editReservationDialog.handlers.cancel({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  finish();
  await pending;
});

test('Add uses an empty form, pauses refresh, posts six fields and displays the new booking', async () => {
  let stored = rows.map(row => ({ ...row }));
  let calls = 0;
  let posted;
  const ui = page(async (url, options) => {
    calls++;
    if (options.method === 'POST') {
      assert.equal(url, '/api/reservations');
      posted = JSON.parse(options.body);
      const created = { id: 13, ...posted };
      stored.push(created);
      return result(created);
    }
    return result(stored);
  });
  await ui.ready;
  ui.ids.guestSearchInput.value = 'Unrelated guest';
  ui.ids.reservationDateFilter.value = '2026-10-18';
  ui.ids.addReservation.handlers.click();
  assert.equal(ui.ids.editReservationTitle.textContent, 'Add reservation');
  assert.equal(ui.ids.editGuestName.value, '');
  assert.equal(ui.ids.editPhoneNumber.value, '');
  assert.equal(ui.ids.editDate.value, '2026-10-18');
  assert.equal(ui.ids.editTime.value, '');
  assert.equal(ui.ids.editTable.value, 'F01');
  ui.ids.editGuestName.value = ' New Guest ';
  ui.ids.editPhoneNumber.value = '0811111111';
  ui.ids.editTime.value = '21:15';
  ui.ids.editZone.value = 'VIP Lounge';
  ui.ids.editZone.handlers.change();
  ui.ids.editTable.value = 'VIP-2';
  ui.poll();
  await ui.windowHandlers.focus();
  assert.equal(calls, 1);
  await ui.ids.editReservationForm.handlers.submit(submitEvent);
  assert.deepEqual(posted, { guest_name: 'New Guest', phone_number: '0811111111', date: '2026-10-18', time: '21:15', zone: 'VIP Lounge', table_number: 'VIP-2' });
  assert.equal(ui.ids.editReservationDialog.open, false);
  assert.equal(ui.ids.reservationCount.textContent, '3');
  assert.equal(ui.ids.guestSearchInput.value, '');
  assert.equal(ui.ids.reservationListStatus.textContent, 'Showing 1 of 3 reservations');
  assert.equal(ui.ids.reservationTableBody.children[0].children[0].children[0].textContent, 'New Guest');
});

test('cancelling Add sends no request and reopening Add clears the previous draft', async () => {
  let calls = 0;
  const ui = page(async () => { calls++; return result(rows); });
  await ui.ready;
  ui.ids.addReservation.handlers.click();
  ui.ids.editGuestName.value = 'Abandoned draft';
  ui.ids.cancelReservationEdit.handlers.click();
  assert.equal(calls, 1);
  ui.ids.addReservation.handlers.click();
  assert.equal(ui.ids.editGuestName.value, '');
  ui.ids.cancelReservationEdit.handlers.click();
  action(ui, 0);
  assert.equal(ui.ids.editReservationTitle.textContent, 'Edit reservation R-12');
  assert.equal(ui.ids.saveReservationEdit.textContent, 'Save changes');
});

test('Add errors preserve draft values and allow correcting an occupied table', async () => {
  let failing = true;
  let stored = [...rows];
  const ui = page(async (url, options) => {
    if (options.method === 'POST') {
      if (failing) return { ok: false, status: 409, json: async () => ({ error: { message: 'This table is already booked for the selected date.' } }) };
      const saved = { id: 13, ...JSON.parse(options.body) };
      stored.push(saved);
      return result(saved);
    }
    return result(stored);
  });
  await ui.ready;
  ui.ids.addReservation.handlers.click();
  ui.ids.editGuestName.value = 'New Guest';
  ui.ids.editPhoneNumber.value = '0811111111';
  ui.ids.editDate.value = '2026-10-17';
  ui.ids.editTime.value = '20:30';
  ui.ids.editTable.value = 'F02';
  await ui.ids.editReservationForm.handlers.submit(submitEvent);
  assert.equal(ui.ids.editReservationDialog.open, true);
  assert.equal(ui.ids.editGuestName.value, 'New Guest');
  assert.equal(ui.ids.reservationCount.textContent, '2');
  assert.match(ui.ids.editReservationError.textContent, /already booked/);
  assert.equal(ui.ids.saveReservationEdit.disabled, false);
  failing = false;
  ui.ids.editTable.value = 'F03';
  await ui.ids.editReservationForm.handlers.submit(submitEvent);
  assert.equal(ui.ids.editReservationDialog.open, false);
  assert.equal(ui.ids.reservationCount.textContent, '3');
});

test('Add prevents double submission while the request is pending', async () => {
  let writes = 0;
  let finish;
  const ui = page(async (url, options) => {
    if (options.method === 'POST') {
      writes++;
      await new Promise(resolve => { finish = resolve; });
      return result({ id: 13, ...rows[0] });
    }
    return result(rows);
  });
  await ui.ready;
  ui.ids.addReservation.handlers.click();
  const pending = ui.ids.editReservationForm.handlers.submit(submitEvent);
  await ui.ids.editReservationForm.handlers.submit(submitEvent);
  assert.equal(writes, 1);
  assert.equal(ui.ids.saveReservationEdit.disabled, true);
  ui.ids.cancelReservationEdit.handlers.click();
  assert.equal(ui.ids.editReservationDialog.open, true);
  finish();
  await pending;
});
