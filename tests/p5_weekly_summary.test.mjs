// tests/p5_weekly_summary.test.mjs — P5 "This Week" summary card.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

function addWorkout(app, dateMs, exercises) {
  const w = {
    id: 'w_' + dateMs,
    title: 'Workout',
    date: dateMs,
    durationSec: 3600,
    totalVolume: 0,
    totalSets: 0,
    exercises: exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, done: true })) }))
  };
  w.exercises.forEach(item => {
    item.sets.forEach(s => { w.totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0); });
    w.totalSets += item.sets.length;
  });
  app.api.state.history.push(w);
  return w;
}

function addBodyEntry(app, dateKey, weightKg) {
  if (!app.api.state.body) app.api.state.body = [];
  app.api.state.body.push({ id: 'body-' + dateKey, date: dateKey, weightKg, measures: {} });
  app.api.state.body = app.api.normalizeBodyEntries(app.api.state.body);
}

describe('P5 Weekly Summary — computeWeekSummary', () => {
  it('week-bounds-follow-week-start-setting', () => {
    const app = createApp();
    // Monday 2026-10-19 and Sunday 2026-10-25 (same Mon-Sun week)
    const mon = new Date('2026-10-19T12:00:00').getTime();
    const sun = new Date('2026-10-25T12:00:00').getTime();
    // Previous Monday 2026-10-12 (prev Mon-Sun week), Previous Sunday 2026-10-11 (week before that for Mon start)
    const prevMon = new Date('2026-10-12T12:00:00').getTime();
    const prevSun = new Date('2026-10-11T12:00:00').getTime();
    addWorkout(app, mon, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 5 }] }]);
    addWorkout(app, sun, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 5 }] }]);
    addWorkout(app, prevMon, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 5 }] }]);
    addWorkout(app, prevSun, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 5 }] }]);

    // Week start Monday: Mon-Sun current week has 2 workouts (19th, 25th), prev week has 1 (12th). 11th is in week before prev.
    app.api.state.weekStart = 'mon';
    app.api.saveState();
    let wsMon = app.api.startOfWeekMs(mon, app.api.getWeekStartDayNum());
    let sumMon = app.api.computeWeekSummary(wsMon);
    assert.equal(sumMon.workouts.thisWeek, 2);
    assert.equal(sumMon.workouts.prevWeek, 1);

    // Week start Sunday: Sun-Sat current week has Sun(25th) only = 1. Prev week (Oct 18-24) has Mon(19th) = 1.
    app.api.state.weekStart = 'sun';
    app.api.saveState();
    let wsSun = app.api.startOfWeekMs(sun, app.api.getWeekStartDayNum());
    let sumSun = app.api.computeWeekSummary(wsSun);
    assert.equal(sumSun.workouts.thisWeek, 1);
    assert.equal(sumSun.workouts.prevWeek, 1);
  });

  it('counts-exclude-warmups', () => {
    const app = createApp();
    const now = Date.now();
    const ws = app.api.startOfWeekMs(now, app.api.getWeekStartDayNum());
    addWorkout(app, ws + 86400000, [{
      exId: 'ex1',
      sets: [
        { type: 'W', weight: 40, reps: 10 },
        { type: 'N', weight: 100, reps: 5 },
        { type: 'D', weight: 80, reps: 4 },
        { type: 'F', weight: 60, reps: 3 },
      ]
    }]);
    const sum = app.api.computeWeekSummary(ws);
    // Warm-up excluded, D and F counted
    assert.equal(sum.totalSets.thisWeek, 3);
    // Volume: 100*5 + 80*4 + 60*3 = 500 + 320 + 180 = 1000
    assert.equal(sum.totalVolume.thisWeek, 1000);
  });

  it('compare-with-previous-week', () => {
    const app = createApp();
    const now = Date.now();
    const ws = app.api.startOfWeekMs(now, app.api.getWeekStartDayNum());
    const prevWs = ws - 7 * 86400000;

    // This week: 2 workouts, 2 sets (1 per workout), 1000 vol each = 2000, 7200 sec
    addWorkout(app, ws + 86400000, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 10 }] }]); // 1 set, 1000 vol
    addWorkout(app, ws + 2 * 86400000, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 10 }] }]); // 1 set, 1000 vol
    // Prev week: 1 workout, 1 set, 1000 vol, 3600 sec
    addWorkout(app, prevWs + 86400000, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 10 }] }]);

    const sum = app.api.computeWeekSummary(ws);
    assert.equal(sum.workouts.diffLabel, '+1 vs last week');
    assert.equal(sum.totalSets.diffLabel, '+1 vs last week');
    assert.equal(sum.totalVolume.diffLabel, '+1000 vs last week');
    assert.equal(sum.totalTimeSec.diffLabel, '+1 h vs last week');

    // Same
    const app2 = createApp();
    const ws2 = app2.api.startOfWeekMs(now, app2.api.getWeekStartDayNum());
    addWorkout(app2, ws2 + 86400000, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 10 }] }]);
    addWorkout(app2, ws2 - 7 * 86400000 + 86400000, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 10 }] }]);
    const sum2 = app2.api.computeWeekSummary(ws2);
    assert.equal(sum2.workouts.diffLabel, 'same');

    // Negative
    const app3 = createApp();
    const ws3 = app3.api.startOfWeekMs(now, app3.api.getWeekStartDayNum());
    addWorkout(app3, ws3 - 7 * 86400000 + 86400000, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 10 }] }]);
    const sum3 = app3.api.computeWeekSummary(ws3);
    assert.equal(sum3.workouts.diffLabel, '−1 vs last week');
  });

  it('volume-in-display-unit', () => {
    const app = createApp();
    const now = Date.now();
    const ws = app.api.startOfWeekMs(now, app.api.getWeekStartDayNum());
    addWorkout(app, ws + 86400000, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 10 }] }]); // 1000 kg

    // KG mode
    app.api.state.unit = 'KG';
    let sumKg = app.api.computeWeekSummary(ws);
    assert.equal(app.api.toDisplayVolume(sumKg.totalVolume.thisWeek, 'KG'), 1000);

    // LBS mode: 1000 kg * 2.20462 = 2204.62 -> rounded to 2205 (>=100 rounds to integer)
    app.api.state.unit = 'LBS';
    let sumLbs = app.api.computeWeekSummary(ws);
    assert.equal(app.api.toDisplayVolume(sumLbs.totalVolume.thisWeek, 'LBS'), 2205);
  });

  it('records-reuse-existing-logic-max-3-plus-more', () => {
    const app = createApp();
    // A fixed past week so no workout lands in the future.
    const ws = app.api.startOfWeekMs(new Date('2026-10-12T12:00:00').getTime(), app.api.getWeekStartDayNum());
    for (let i = 1; i <= 4; i++) {
      addWorkout(app, ws + i * 3600000 * 20, [{ exId: 'ex' + i, sets: [{ type: 'N', weight: 100 + i * 10, reps: 5 }] }]);
    }
    const sum = app.api.computeWeekSummary(ws);
    assert.equal(sum.records.length, 3, 'max 3 lines');
    assert.equal(sum.moreRecords, 1, '+1 more');
    assert.equal(sum.records.map(r => r.kind).join(','), 'bestE1RM,bestE1RM,bestE1RM', 'one line per exercise, strongest kind');
    assert.equal(new Set(sum.records.map(r => r.exId)).size, 3, 'three different exercises');
    for (const r of sum.records) {
      const rec = app.api.exerciseRecords(r.exId).bestE1RM;
      assert.equal(r.dateMs, rec.dateMs, 'same record as the Records tab');
      assert.ok(r.display.endsWith(' kg'), 'kg unit');
    }
    app.api.state.unit = 'LBS';
    assert.ok(app.api.computeWeekSummary(ws).records[0].display.endsWith(' lb'), 'lb unit in LBS mode');
    // A record from an earlier week is not "this week".
    const app2 = createApp();
    addWorkout(app2, ws - 3 * 86400000, [{ exId: 'ex1', sets: [{ type: 'N', weight: 200, reps: 5 }] }]);
    addWorkout(app2, ws + 86400000, [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 5 }] }]);
    assert.equal(app2.api.computeWeekSummary(ws).records.length, 0, 'old record not shown');
  });

  it('body-line-only-with-enough-data', () => {
    const app = createApp();
    const now = Date.now();
    const ws = app.api.startOfWeekMs(now, app.api.getWeekStartDayNum());
    const prevWs = ws - 7 * 86400000;
    const thisWeekKey = app.api.dayKeyLocal(ws + 86400000);
    const prevWeekKey = app.api.dayKeyLocal(prevWs + 86400000);

    // No body data
    let sum = app.api.computeWeekSummary(ws);
    assert.equal(sum.bodyLine, null);

    // Only this week
    addBodyEntry(app, thisWeekKey, 80);
    sum = app.api.computeWeekSummary(ws);
    assert.equal(sum.bodyLine, null);

    // Both weeks
    addBodyEntry(app, prevWeekKey, 81);
    sum = app.api.computeWeekSummary(ws);
    assert.notEqual(sum.bodyLine, null);
    assert.equal(sum.bodyLine.thisWeekDisplay, '80 kg');
    assert.equal(sum.bodyLine.prevWeekDisplay, '81 kg');
    // delta = 80 - 81 = -1
    assert.equal(sum.bodyLine.diffLabel, '−1 kg vs last week');
  });

  it('top-3-muscles-by-sets', () => {
    const app = createApp();
    const now = Date.now();
    const ws = app.api.startOfWeekMs(now, app.api.getWeekStartDayNum());

    // ex1=Chest, ex4=Back, ex7=Quads (Legs), ex11=Shoulders, ex13=Biceps (Arms), ex15=Core
    // Chest: 5 sets, Back: 3 sets, Legs: 4 sets, Shoulders: 2, Arms: 1, Core: 0
    addWorkout(app, ws + 86400000, [
      { exId: 'ex1', sets: Array(5).fill({ type: 'N', weight: 100, reps: 5 }) }, // Chest 5
      { exId: 'ex4', sets: Array(3).fill({ type: 'N', weight: 100, reps: 5 }) }, // Back 3
      { exId: 'ex7', sets: Array(4).fill({ type: 'N', weight: 100, reps: 5 }) }, // Legs 4
      { exId: 'ex11', sets: Array(2).fill({ type: 'N', weight: 100, reps: 5 }) }, // Shoulders 2
      { exId: 'ex13', sets: Array(1).fill({ type: 'N', weight: 100, reps: 5 }) }, // Arms 1
    ]);
    const sum = app.api.computeWeekSummary(ws);
    assert.equal(sum.muscles.length, 3);
    assert.equal(sum.muscles[0].muscle, 'Chest');
    assert.equal(sum.muscles[0].sets, 5);
    assert.equal(sum.muscles[1].muscle, 'Legs');
    assert.equal(sum.muscles[1].sets, 4);
    assert.equal(sum.muscles[2].muscle, 'Back');
    assert.equal(sum.muscles[2].sets, 3);
  });

  it('empty-week-state', () => {
    const app = createApp();
    const now = Date.now();
    const ws = app.api.startOfWeekMs(now, app.api.getWeekStartDayNum());

    // No workouts this week
    const sum = app.api.computeWeekSummary(ws);
    assert.equal(sum.hasWorkouts, false);

    // Render should use emptyStateHtml
    app.api.weekSummaryViewWeekStartMs = ws;
    app.api.renderWeekSummaryCard();
    const html = app.document.getElementById('weekSummaryCard').innerHTML;
    assert.ok(html.includes('No workouts this week'));
    assert.ok(html.includes('Start a workout to see your summary'));
  });

  it('prev-arrow-and-no-future-week', () => {
    const app = createApp();
    const now = Date.now();
    const ws = app.api.startOfWeekMs(now, app.api.getWeekStartDayNum());

    // Current week: next arrow disabled
    app.api.weekSummaryViewWeekStartMs = ws;
    app.api.renderWeekSummaryCard();
    let html = app.document.getElementById('weekSummaryCard').innerHTML;
    assert.ok(html.includes('aria-disabled="true"') || html.includes('opacity:0.4'));

    // Previous week: next arrow enabled
    app.api.showWeekSummaryPrev();
    html = app.document.getElementById('weekSummaryCard').innerHTML;
    assert.ok(!html.includes('aria-disabled="true"'));
    assert.ok(html.includes('opacity:1'));
  });

  it('handlers-compile', () => {
    const app = createApp();
    const now = Date.now();
    const ws = app.api.startOfWeekMs(now, app.api.getWeekStartDayNum());
    app.api.weekSummaryViewWeekStartMs = ws;
    app.api.renderWeekSummaryCard();
    const html = app.document.getElementById('weekSummaryCard').innerHTML || '';
    const attrs = [...html.matchAll(/onclick="([^"]+)"/g)].map(m => m[1]);
    attrs.forEach(a => { new Function(a); }); // throws if invalid
  });

  it('nothing-wider-than-412', () => {
    const app = createApp();
    const now = Date.now();
    const ws = app.api.startOfWeekMs(now, app.api.getWeekStartDayNum());
    app.api.weekSummaryViewWeekStartMs = ws;
    app.api.renderWeekSummaryCard();
    const html = app.document.getElementById('weekSummaryCard').innerHTML || '';
    // No fixed width > 412px in style attributes
    const widths = [...html.matchAll(/width\s*:\s*(\d+)px/g)].map(m => parseInt(m[1], 10));
    widths.forEach(w => assert.ok(w <= 412, 'Fixed width ' + w + 'px exceeds 412px'));
    // No inline style with max-width > 412
    const maxWidths = [...html.matchAll(/max-width\s*:\s*(\d+)px/g)].map(m => parseInt(m[1], 10));
    maxWidths.forEach(w => assert.ok(w <= 412, 'Max width ' + w + 'px exceeds 412px'));
  });
});