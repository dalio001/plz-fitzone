// tests/p4_12_gcal.test.mjs — P4-12: program workouts sent to a "PLZ Train"
// Google calendar. Only the app-created-calendar permission; events have
// fixed ids, so a moved day updates the same event and a removed one is deleted.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml } from './harness.mjs';
import { readFileSync } from 'node:fs';

function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// A tiny fake of the Google Calendar API.
function fakeGoogle() {
  const g = { calendars: {}, events: {}, calls: [] };
  g.fetch = async (url, opts = {}) => {
    const u = new URL(url);
    const method = opts.method || 'GET';
    const path = u.pathname.replace('/calendar/v3', '');
    g.calls.push(method + ' ' + path);
    const body = opts.body ? JSON.parse(opts.body) : null;
    const reply = (status, j) => ({ ok: status < 300, status, json: async () => j });
    if (method === 'POST' && path === '/calendars') { g.calendars.c1 = body; return reply(200, { id: 'c1' }); }
    const m = path.match(/^\/calendars\/([^/]+)(\/events)?(\/([^/]+))?$/);
    if (!m || !g.calendars[decodeURIComponent(m[1])]) return reply(404, {});
    if (!m[2]) return reply(200, { id: m[1] });
    const id = m[4];
    if (method === 'GET') return reply(200, { items: Object.values(g.events) });
    if (method === 'POST') { if (g.events[body.id]) return reply(409, {}); g.events[body.id] = body; return reply(200, body); }
    if (method === 'PUT') { g.events[id] = body; return reply(200, body); }
    if (method === 'DELETE') { delete g.events[id]; return { ok: true, status: 204, json: async () => null }; }
    return reply(400, {});
  };
  return g;
}

function setup() {
  const g = fakeGoogle();
  const store = new Map();
  store.set('plz_gcal', JSON.stringify({ on: true }));
  const app = createApp({ store, fetch: g.fetch });
  const today = app.api.todayPlanKey();
  const fid = app.api.DEFAULT_FOLDER_ID;
  app.api.saveProgramSetup(fid, false, { start: today, length: 7, days: { rt1: 1, rt2: 3 } });
  return { app, g, today, fid, store };
}

describe('P4-12 Google Calendar', () => {
  it('asks only for the app-created-calendar permission; Google is never cached', () => {
    const { app } = setup();
    assert.equal(app.api.GCAL_SCOPE, 'https://www.googleapis.com/auth/calendar.app.created');
    const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
    assert.ok(sw.includes('(googleapis|google|gstatic)'));
    assert.ok(!loadIndexHtml().includes("localStorage.setItem('gcalToken"), 'token never stored');
  });

  it('event ids use only letters a-v and digits, one per workout and cycle', () => {
    const { app } = setup();
    const id = app.api.gcalEventId('fd_default', 'rt1', '2026-11-05');
    assert.match(id, /^[a-v0-9]{5,1024}$/);
    assert.notEqual(id, app.api.gcalEventId('fd_default', 'rt1', '2026-11-12'));
    const ev = app.api.gcalDesiredEvents();
    assert.equal(ev.length, 2);
    assert.ok(ev[0].title.startsWith('Push'));
  });

  it('sync creates the calendar and events, then moves, ticks and removes them', async () => {
    const { app, g, today, fid, store } = setup();
    assert.equal(app.api.gcalPending(), true);
    assert.equal(await app.api.gcalSync(), true);
    assert.equal(g.calendars.c1.summary, 'PLZ Train');
    assert.equal(Object.keys(g.events).length, 2);
    assert.equal(app.api.gcalPending(), false);
    const id1 = app.api.gcalEventId(fid, 'rt1', today);
    assert.equal(g.events[id1].start.date, today);
    assert.equal(g.events[id1].end.date, addDays(today, 1));

    app.api.moveProgramDay(fid, 'rt1', 2);
    app.api.markProgram(fid, 'rt2', 'skipped');
    assert.equal(app.api.gcalPending(), true);
    await app.api.gcalSync();
    assert.equal(g.events[id1].start.date, addDays(today, 1), 'same event, new day');
    assert.ok(g.events[app.api.gcalEventId(fid, 'rt2', today)].summary.startsWith('⏭'));

    app.api.moveProgramDay(fid, 'rt2', 0);
    await app.api.gcalSync();
    assert.equal(Object.keys(g.events).length, 1, 'workout with no day is removed');
    assert.equal(JSON.parse(store.get('plz_gcal')).calendarId, 'c1');
  });

  it('P2-16 times: usual time, own time, all day; Google gets timed blocks', async () => {
    const { app, g, today, fid, store } = setup();
    app.api.saveProgramSetup(fid, false, { start: today, length: 7, days: { rt1: 1, rt2: 3 }, time: '18:00', minutes: 75 });
    app.api.setProgramItemTime(fid, 'rt2', '07:30');
    const p = app.api.state.folders[0].program;
    assert.equal(app.api.programItemTime(p, 'rt1'), '18:00');
    assert.equal(app.api.programItemTime(p, 'rt2'), '07:30');
    assert.equal(app.api.setProgramItemTime(fid, 'rt2', '7h30'), false, 'bad time refused');
    await app.api.gcalSync();
    const e1 = g.events[app.api.gcalEventId(fid, 'rt1', today)];
    assert.equal(e1.start.dateTime, today + 'T18:00:00');
    assert.equal(e1.end.dateTime, today + 'T19:15:00');
    app.api.setProgramItemTime(fid, 'rt1', 'allday');
    await app.api.gcalSync();
    assert.equal(g.events[app.api.gcalEventId(fid, 'rt1', today)].start.date, today);
    const app2 = createApp({ store, fetch: g.fetch });
    const p2 = app2.api.state.folders[0].program;
    assert.equal(p2.time, '18:00');
    assert.equal(p2.minutes, 75);
    assert.equal(JSON.stringify(p2.times), JSON.stringify({ rt2: '07:30', rt1: 'allday' }));
  });

  it('a Google error is shown, nothing is marked as sent', async () => {
    const store = new Map();
    store.set('plz_gcal', JSON.stringify({ on: true }));
    const app = createApp({ store, fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    app.api.saveProgramSetup(app.api.DEFAULT_FOLDER_ID, false, { start: app.api.todayPlanKey(), length: 7, days: { rt1: 1 } });
    assert.equal(await app.api.gcalSync(), false);
    assert.equal(app.api.gcalPending(), true);
    app.api.renderGcalSettings();
    assert.ok(app.el('gcalBody').innerHTML.includes('Google answered 500'));
  });
});
