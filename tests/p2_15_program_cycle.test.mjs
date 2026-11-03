// tests/p2_15_program_cycle.test.mjs — P2-15 step 2: a folder as a program cycle.
// Owner choices 2026-11-03: he picks the cycle length and the day of each
// workout; Done ticks; Skip never counts; nothing repeats by itself; Reset keeps
// the workouts and clears the ticks; it shows in the training calendar.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

function same(actual, expected, msg) {
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, msg);
}

function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function programApp(store) {
  const app = createApp(store ? { store } : undefined);
  const today = app.api.todayPlanKey();
  const fid = app.api.DEFAULT_FOLDER_ID;
  // Started two days ago, 8 days long: rt1 day 1 (past), rt2 day 3 (today), rt3 day 6.
  const prog = app.api.saveProgramSetup(fid, false, { start: addDays(today, -2), length: 8, days: { rt1: 1, rt2: 3, rt3: 6 } });
  assert.ok(prog);
  return { app, today, fid };
}

describe('P2-15 program cycle', () => {
  it('junk programs are dropped; day numbers outside the cycle are removed', () => {
    const { app } = programApp();
    assert.equal(app.api.normalizeProgram({ start: 'nope', length: 7 }), null);
    assert.equal(app.api.normalizeProgram({ start: '2026-11-03', length: 0 }), null);
    assert.equal(app.api.normalizeProgram({ start: '2026-11-03', length: 40 }), null);
    const p = app.api.normalizeProgram({ start: '2026-11-03', length: 6, days: { a: 2, b: 9, c: 'x' }, marks: { a: 'done', b: 'maybe' } });
    same(p.days, { a: 2 });
    same(p.marks, { a: 'done' });
    assert.equal(p.view, 'list');
    assert.equal(app.api.programDayKey(p, 1), '2026-11-03');
    assert.equal(app.api.programDayKey(p, 6), '2026-11-08');
  });

  it('status: late, today, to do; summary shows the current day', () => {
    const { app, today } = programApp();
    const f = app.api.state.folders[0];
    const r = (id) => app.api.state.routines.find((x) => x.id === id);
    assert.equal(app.api.programItemStatus(f.program, r('rt1'), today), 'late');
    assert.equal(app.api.programItemStatus(f.program, r('rt2'), today), 'today');
    assert.equal(app.api.programItemStatus(f.program, r('rt3'), today), 'todo');
    same(app.api.programSummary(f.program, app.api.state.routines, today), { dayNow: 3, length: 8, done: 0, skipped: 0, left: 3 });
  });

  it('Done and Skip ticks; skipped never counts as done; Undo clears', () => {
    const { app, today, fid } = programApp();
    app.api.markProgram(fid, 'rt1', 'done');
    app.api.markProgram(fid, 'rt3', 'skipped');
    const f = app.api.state.folders[0];
    same(app.api.programSummary(f.program, app.api.state.routines, today), { dayNow: 3, length: 8, done: 1, skipped: 1, left: 1 });
    app.api.markProgram(fid, 'rt3', null);
    assert.equal(f.program.marks.rt3, undefined);
  });

  it('a finished workout of that routine since the start counts as done', () => {
    const { app, today } = programApp();
    app.api.state.history.push({ id: 'h1', date: Date.now(), routineId: 'rt3', exercises: [] });
    app.api.state.history.push({ id: 'h0', date: new Date(addDays(today, -5) + 'T12:00:00').getTime(), routineId: 'rt1', exercises: [] });
    const f = app.api.state.folders[0];
    const r = (id) => app.api.state.routines.find((x) => x.id === id);
    assert.equal(app.api.programItemStatus(f.program, r('rt3'), today), 'done', 'done early is fine');
    assert.equal(app.api.programItemStatus(f.program, r('rt1'), today), 'late', 'a workout before the cycle does not count');
  });

  it('Reset keeps the workouts and days, takes the new start/length and clears ticks; survives reload', () => {
    const store = new Map();
    const { app, today, fid } = programApp(store);
    app.api.markProgram(fid, 'rt1', 'done');
    app.api.setProgramView(fid, 'calendar');
    app.api.saveProgramSetup(fid, true, { start: today, length: 10, days: { rt1: 1, rt2: 4, rt3: 9 } });
    const app2 = createApp({ store });
    const p = app2.api.state.folders[0].program;
    same(p, { start: today, length: 10, days: { rt1: 1, rt2: 4, rt3: 9 }, marks: {}, view: 'calendar' });
  });

  it('editing days (not a reset) keeps the ticks; stop removes the program only', () => {
    const { app, today, fid } = programApp();
    app.api.markProgram(fid, 'rt2', 'skipped');
    app.api.saveProgramSetup(fid, false, { start: addDays(today, -2), length: 8, days: { rt1: 2, rt2: 3, rt3: 6 } });
    assert.equal(app.api.state.folders[0].program.marks.rt2, 'skipped');
    app.api.stopProgram(fid);
    assert.equal(app.api.state.folders[0].program, undefined);
    assert.equal(app.api.state.routines.length, 3);
  });

  it('the training calendar sees program workouts on their day', () => {
    const { app, today } = programApp();
    const items = app.api.programItemsOn(today);
    assert.equal(items.length, 1);
    assert.equal(items[0].routine.id, 'rt2');
    assert.equal(app.api.programItemsOn(addDays(today, 3)).length, 1);
    assert.equal(app.api.programItemsOn(addDays(today, 1)).length, 0, 'rest day');
    app.api.renderTrainingCalendar();
    assert.ok(!app.el('calendarGrid').innerHTML.includes('No workouts yet'), 'a program alone fills the calendar');
    app.api.openDaySheet(today, [], null);
    assert.ok(app.el('calDayBody').innerHTML.includes('Program'));
  });

  it('the folder shows the program bar, strips and the calendar view', () => {
    const { app, fid } = programApp();
    app.api.renderRoutines();
    const list = app.el('routinesList');
    const text = () => Array.from(list.children || list.childNodes || []).map((k) => k.innerHTML || k.textContent || '').join('\n');
    assert.ok(text().includes('Day 3 of 8'));
    assert.ok(text().includes('⏭ Skip'));
    app.api.setProgramView(fid, 'calendar');
    assert.ok(text().includes('prog-day-today'));
  });
});
