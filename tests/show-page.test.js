const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function page(fetch) {
  function element() {
    return {
      textContent: '', hidden: false, dataset: {}, children: [], handlers: {},
      setAttribute(name, value) { this[name] = value; },
      replaceChildren(...children) { this.children = children; },
      addEventListener(event, handler) { this.handlers[event] = handler; },
    };
  }
  const ids = Object.fromEntries(['showsList', 'showsStatus', 'retryShows', 'showTemplate'].map(id => [id, element()]));
  ids.showTemplate.content = { firstElementChild: { cloneNode() {
    const item = element();
    const nodes = Object.fromEntries(['.band-title', '.genre-tag', '.date-badge', '.start-time', '.arrow-btn'].map(selector => [selector, element()]));
    item.querySelector = selector => nodes[selector];
    return item;
  } } };
  let ready;
  const document = {
    getElementById: id => ids[id],
    addEventListener: (event, handler) => { ready = handler(); },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/pages/show.js'), 'utf8'), { document, fetch });
  return { ids, ready };
}

const shows = Array.from({ length: 5 }, (_, i) => ({
  show_id: i + 1, artist_id: i + 1, performance_date: `2026-10-${16 + i}`,
  artist_name: i === 0 ? '<img src=x onerror=alert(1)>' : `Artist ${i}`,
  artist_type: 'group', genre: 'Jazz & Soul', start_time: i === 0 ? '00:05' : '20:30', end_time: '23:00',
}));

test('renders all database shows with text content, correct dates and 12-hour times', async () => {
  const ui = page(async url => {
    assert.equal(url, '/api/shows');
    return { ok: true, json: async () => ({ data: shows }) };
  });
  await ui.ready;
  const items = ui.ids.showsList.children;
  assert.equal(items.length, 5);
  items.forEach((item, index) => assert.equal(item.querySelector('.arrow-btn').href, `/reserve.html?show_id=${shows[index].show_id}`));
  assert.equal(items[0].querySelector('.band-title').textContent, shows[0].artist_name);
  assert.equal(items[0].querySelector('.date-badge').textContent, '16 OCT 2026');
  assert.equal(items[0].querySelector('.date-badge').dateTime, '2026-10-16');
  assert.equal(items[0].querySelector('.start-time').textContent, '12:05 AM');
  assert.equal(items[1].querySelector('.start-time').textContent, '8:30 PM');
  assert.equal(ui.ids.showsStatus.hidden, true);
  assert.equal(ui.ids.showsList['aria-busy'], 'false');
});

test('empty shows list displays an empty state without fake cards', async () => {
  const ui = page(async () => ({ ok: true, json: async () => ({ data: [] }) }));
  await ui.ready;
  assert.equal(ui.ids.showsList.children.length, 0);
  assert.match(ui.ids.showsStatus.textContent, /No shows scheduled/);
  assert.equal(ui.ids.retryShows.hidden, true);
});

test('a failed request displays a retry option and retry loads fresh data', async () => {
  let attempts = 0;
  const ui = page(async () => ++attempts === 1
    ? { ok: false }
    : { ok: true, json: async () => ({ data: shows }) });
  await ui.ready;
  assert.equal(ui.ids.showsList.children.length, 0);
  assert.equal(ui.ids.retryShows.hidden, false);
  assert.match(ui.ids.showsStatus.textContent, /Unable to load/);
  await ui.ids.retryShows.handlers.click();
  assert.equal(ui.ids.showsList.children.length, 5);
  assert.equal(ui.ids.retryShows.hidden, true);
});

test('a network error is shown instead of leaving the list loading', async () => {
  const ui = page(async () => { throw new Error('offline'); });
  await ui.ready;
  assert.equal(ui.ids.retryShows.hidden, false);
  assert.equal(ui.ids.showsList['aria-busy'], 'false');
});
