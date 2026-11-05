// tests/p2_17_one_plan.test.mjs — P2-17: the week plan (Profile calendar) and
// the program cycles speak to each other. Owner, 2026-11-05: "everything we put
// in the new one should appear in the old one and vice versa".
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function programApp() {
  const app = createApp();
  const today = app.api.todayPlanKey();
  const fid = app.api.DEFAULT_FOLDER_ID;
  // Started yesterday, 7 days: rt1 day 2 (today), rt2 day 4, rt3 day 6.
  assert.ok(app.api.saveProgramSetup(fid, false, { start: addDays(today, -1), length: 7, days: { rt1: 2, rt2: 4, rt3: 6 } }));
  return { app, today, fid, f: app.api.state.folders[0] };
}

describe('P2-17 one plan', () => {
  it('cycle day of a date: inside the cycle only', () => {
    const { app, today, f } = programApp();
    assert.equal(app.api.programDayIndex(f.program, addDays(today, -1)), 1);
    assert.equal(app.api.programDayIndex(f.program, addDays(today, 5)), 7);
    assert.equal(app.api.programDayIndex(f.program, addDays(today, 6)), 0);
    assert.equal(app.api.programDayIndex(f.program, addDays(today, -2)), 0);
    assert.equal(app.api.programFolderOf('rt2').id, f.id);
  });

  it('planning a program workout in the Profile calendar moves it in the program', () => {
    const { app, today, f } = programApp();
    const key = addDays(today, 1); // cycle day 3
    assert.equal(app.api.savePlanForDay(key, 'rt3'), true);
    assert.equal(f.program.days.rt3, 3);
    assert.equal(app.api.getPlan(key), null, 'no second copy as a week plan');
    assert.ok(app.api.programItemsOn(key).some((x) => x.routine.id === 'rt3'));
  });

  it('outside the cycle, or a rest day, stays a week plan', () => {
    const { app, today, f } = programApp();
    const far = addDays(today, 10);
    assert.equal(app.api.savePlanForDay(far, 'rt3'), true);
    assert.equal(f.program.days.rt3, 6, 'program unchanged');
    assert.equal(app.api.getPlan(far).routineId, 'rt3');
    assert.equal(app.api.saveRestPlanForDay(addDays(today, 2)), true);
    assert.equal(app.api.getPlan(addDays(today, 2)).kind, 'rest');
  });

  it('a week plan inside the cycle shows in the program calendar and can be dragged there', () => {
    const { app, today, f } = programApp();
    const key = addDays(today, 2);
    app.api.state.plans = { [key]: { routineId: 'rt3', kind: 'rest', createdAt: 1 } };
    const rts = app.api.state.routines.filter((r) => r.folderId === f.id);
    const html = app.api.programCalendar(f, rts).innerHTML;
    assert.match(html, /data-plan="[0-9-]+"/);
    assert.match(html, /prog-dayplan/);
    assert.match(html, />Rest</);
    const to = addDays(today, 3);
    assert.equal(app.api.movePlan(key, to), true);
    assert.equal(app.api.getPlan(to).kind, 'rest');
    assert.equal(app.api.getPlan(key), null);
  });

  it('same routine on the same day as a program workout shows once', () => {
    const { app, today } = programApp();
    const progRts = app.api.programItemsOn(today).map((x) => x.routine);
    app.api.state.plans = { [today]: { routineId: 'rt1', kind: 'routine', createdAt: 1 } };
    assert.equal(app.api.dayPlanChipHtml(today, progRts), '');
    assert.equal(app.api.programWeekCount(Date.now(), app.api.getWeekStartDayNum()).planned >= 0, true);
    const ev = app.api.gcalDesiredEvents().filter((e) => e.date === today);
    assert.equal(ev.length, 1);
  });

  it('Profile calendar shows the program workout next to a week plan, and the week count includes it', () => {
    const { app, today } = programApp();
    const day4 = addDays(today, 2);
    app.api.state.plans = { [day4]: { routineId: 'rt1', kind: 'routine', createdAt: 1 } };
    app.api.renderTrainingCalendar();
    const grid = app.document.getElementById('calendarGrid').innerHTML;
    const cell = grid.split('data-key="' + day4 + '"')[1].split('cal-day')[0];
    assert.match(cell, /\+1/, 'plan word plus one more (the program workout)');
    const cons = app.document.getElementById('calendarConsistency').innerHTML;
    assert.match(cons, /Planned this week [1-9]/);
  });

  it('day sheet: program workout gets Start, Done, Skip and Day', () => {
    const { app, today } = programApp();
    app.api.openPlanDay(today);
    const body = app.document.getElementById('calDayBody').innerHTML;
    assert.match(body, /▶ Start/);
    assert.match(body, /✓ Done/);
    assert.match(body, /⏭ Skip/);
    assert.match(body, /📅 Day/);
  });

  it('Today card shows today\'s program workout with Start', () => {
    const { app } = programApp();
    app.api.state.plans = {};
    app.api.renderTodayPlan();
    const html = app.document.getElementById('todayPlanCard').innerHTML;
    assert.match(html, /📌 Today: /);
    assert.match(html, /▶ Start/);
  });

  it('Google Calendar gets week plans too (all day, rest days left out)', () => {
    const { app, today } = programApp();
    const far = addDays(today, 12);
    app.api.state.plans = {
      [far]: { routineId: 'rt2', kind: 'routine', createdAt: 1 },
      [addDays(today, 13)]: { routineId: null, kind: 'rest', createdAt: 1 }
    };
    const ev = app.api.gcalDesiredEvents();
    const mine = ev.filter((e) => e.date === far);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].time, '');
    assert.equal(mine[0].note, 'PLZ Train · Week plan');
    assert.equal(mine[0].id, app.api.gcalEventId('day', 'rt2', far));
    assert.equal(ev.filter((e) => e.date === addDays(today, 13)).length, 0);
    assert.ok(ev.every((e) => e.rid === undefined));
  });
});
