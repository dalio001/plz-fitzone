// tests/p4_12_gcal_one_calendar.test.mjs — owner, 2026-11-06: Google showed
// three "PLZ Train" calendars, the old plan stuck in the extra ones. The
// calendar id now rides in the synced state: every device uses one calendar,
// and a copy a device made before is deleted.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

function fakeGoogle() {
  const g = { calendars: {}, events: {}, calls: [], n: 0 };
  g.fetch = async (url, opts = {}) => {
    const u = new URL(url);
    const method = opts.method || 'GET';
    const path = u.pathname.replace('/calendar/v3', '');
    g.calls.push(method + ' ' + path);
    const body = opts.body ? JSON.parse(opts.body) : null;
    const reply = (status, j) => ({ ok: status < 300, status, json: async () => j });
    if (method === 'POST' && path === '/calendars') {
      const id = 'c' + (++g.n);
      g.calendars[id] = body;
      g.events[id] = {};
      return reply(200, { id });
    }
    const m = path.match(/^\/calendars\/([^/]+)(\/events)?(\/([^/]+))?$/);
    const cal = m && decodeURIComponent(m[1]);
    if (!m || !g.calendars[cal]) return reply(404, {});
    if (!m[2]) {
      if (method === 'DELETE') { delete g.calendars[cal]; delete g.events[cal]; return { ok: true, status: 204, json: async () => null }; }
      return reply(200, { id: cal });
    }
    const ev = g.events[cal];
    if (method === 'GET') return reply(200, { items: Object.values(ev) });
    if (method === 'POST') { if (ev[body.id]) return reply(409, {}); ev[body.id] = body; return reply(200, body); }
    if (method === 'PUT') { ev[m[4]] = body; return reply(200, body); }
    if (method === 'DELETE') { delete ev[m[4]]; return { ok: true, status: 204, json: async () => null }; }
    return reply(400, {});
  };
  return g;
}

function device(g, store, gcal) {
  store.set('plz_gcal', JSON.stringify(Object.assign({ on: true }, gcal || {})));
  return createApp({ store, fetch: g.fetch });
}

describe('P4-12 one Google calendar per account', () => {
  it('the calendar id is saved with the account, so a second device reuses it', async () => {
    const g = fakeGoogle();
    const store = new Map();
    const phone = device(g, store);
    phone.api.saveProgramSetup(phone.api.DEFAULT_FOLDER_ID, false, { start: phone.api.todayPlanKey(), length: 7, days: { rt1: 1 } });
    assert.equal(await phone.api.gcalSync(), true);
    assert.equal(phone.api.state.gcalCalendarId, 'c1');
    // Same account state, but this device never connected before.
    const pc = device(g, store, {});
    assert.equal(pc.api.state.gcalCalendarId, 'c1', 'kept in the saved state');
    assert.equal(await pc.api.gcalSync(), true);
    assert.deepEqual(Object.keys(g.calendars), ['c1'], 'no second PLZ Train calendar');
    assert.equal(JSON.parse(store.get('plz_gcal')).calendarId, 'c1');
  });

  it('a copy a device made before is deleted, with its old workouts', async () => {
    const g = fakeGoogle();
    const store = new Map();
    const phone = device(g, store);
    phone.api.saveProgramSetup(phone.api.DEFAULT_FOLDER_ID, false, { start: phone.api.todayPlanKey(), length: 7, days: { rt1: 1 } });
    await phone.api.gcalSync(); // c1, shared
    // An older device that made its own calendar c2 and still remembers it.
    g.calendars.c2 = { summary: 'PLZ Train' };
    g.events.c2 = { old: { id: 'old', summary: 'Push' } };
    g.n = 2;
    const pc = device(g, store, { calendarId: 'c2' });
    assert.equal(await pc.api.gcalSync(), true);
    assert.deepEqual(Object.keys(g.calendars), ['c1']);
    assert.ok(g.calls.includes('DELETE /calendars/c2'));
    assert.equal(pc.api.state.gcalOldCalendarIds, undefined, 'nothing left to delete');
    assert.equal(JSON.parse(store.get('plz_gcal')).calendarId, 'c1');
  });

  it('an existing connection adopts its own calendar as the shared one', async () => {
    const g = fakeGoogle();
    g.calendars.c7 = { summary: 'PLZ Train' };
    g.events.c7 = {};
    const store = new Map();
    const phone = device(g, store, { calendarId: 'c7' });
    assert.equal(phone.api.state.gcalCalendarId, undefined);
    assert.equal(await phone.api.gcalSync(), true);
    assert.equal(phone.api.state.gcalCalendarId, 'c7');
    assert.deepEqual(Object.keys(g.calendars), ['c7']);
  });
});
