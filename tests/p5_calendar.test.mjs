// tests/p5_calendar.test.mjs — P5-03 training calendar, consistency and
// month muscle workload (personal slice). Pure-model assertions run against
// the REAL script via harness createApp(); every date is built with local
// Date constructors because the app's day boundary is local phone time.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml, STATE_KEY } from './harness.mjs';

// 2026: Oct 1 = Thu, Oct 5/12/19 Mon, Oct 11 Sun. Sep 28 Mon.
function ts(y, m, d, h = 10, min = 0) { return new Date(y, m, d, h, min, 0, 0).getTime(); }
function monthLabel(y, m) { return new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }

function histEntry(id, ms, exId, sets, title) {
  return {
    id, title: title || 'Workout', date: ms, durationSec: 3600,
    totalVolume: 0, totalSets: sets.length, prCount: 0,
    exercises: [{ exId, note: '', sets }]
  };
}
function loadSet(weight, reps) { return { type: 'N', weight, reps, done: true }; }
function warmSet(weight, reps) { return { type: 'W', weight, reps, done: true }; }

// Deterministic exercise: no dependence on the shipped catalogue's metadata.
function addEx(app, id, primary, secondary) {
  app.api.state.exercises.push({
    id, name: 'Test ' + id, equipment: 'Barbell',
    primary, secondary: secondary || [], type: 'weight_reps'
  });
  return id;
}

describe('P5-03 calendar and consistency', () => {
  it('week-start-monday-puts-sunday-workout-in-previous-week', () => {
    const app = createApp();
    const sun = ts(2026, 9, 11); // Sun 11 Oct 2026
    const now = ts(2026, 9, 14, 12); // Wed 14 Oct 2026
    const history = [histEntry('w_sun', sun, 'ex1', [loadSet(100, 5)])];

    assert.equal(app.api.startOfWeekMs(sun, 1), ts(2026, 9, 5, 0), 'Monday start: week of Mon 5 Oct');
    assert.equal(app.api.computeConsistency(history, now, 1).thisWeek, 0, 'Sunday is last week');
    assert.equal(app.api.startOfWeekMs(sun, 0), ts(2026, 9, 11, 0), 'Sunday start: week of Sun 11 Oct');
    assert.equal(app.api.computeConsistency(history, now, 0).thisWeek, 1, 'Sunday is this week');

    // Same count through the real render path, driven by the saved setting.
    assert.equal(app.api.computeConsistency(history, now, undefined).thisWeek, 0, 'default is Monday');
  });

  it('week-start-sunday-shifts-the-boundary', () => {
    const app = createApp();
    app.api.state.history = [histEntry('w_sun', ts(2026, 9, 11), 'ex1', [loadSet(100, 5)])];
    const now = ts(2026, 9, 14, 12);

    assert.equal(app.api.computeConsistency(app.api.state.history, now, 1).thisWeek, 0);
    assert.equal(app.api.computeConsistency(app.api.state.history, now, 0).thisWeek, 1);

    app.api.setWeekStart('sun');
    let grid = app.document.getElementById('calendarGrid').innerHTML;
    assert.ok(grid.includes('>Sun<'), 'Sunday-start header shows Sun');
    app.api.setWeekStart('mon');
    grid = app.document.getElementById('calendarGrid').innerHTML;
    assert.ok(grid.indexOf('>Mon<') < grid.indexOf('>Sun<'), 'Monday-start header leads with Mon');
  });

  it('two-workouts-one-day-list-then-open-detail', () => {
    const app = createApp();
    app.api.state.history = [
      histEntry('w_am', ts(2026, 9, 14, 9), 'ex1', [loadSet(100, 5)], 'Morning push'),
      histEntry('w_pm', ts(2026, 9, 14, 18), 'ex1', [loadSet(100, 5)], 'Evening pull'),
      histEntry('w_solo', ts(2026, 9, 13), 'ex1', [loadSet(90, 5)], 'Legs')
    ];
    app.api.showCalendarMonth(2026, 9);

    assert.equal(app.api.openCalendarDay('2026-10-14'), true, 'picker path returns true');
    const picker = app.document.getElementById('calDayBody').innerHTML;
    assert.ok(picker.includes('w_am') && picker.includes('w_pm'), 'both workouts listed');
    assert.ok(picker.includes('Morning push') && picker.includes('Evening pull'), 'titles shown');
    assert.ok(app.document.getElementById('calDayModal').classList.contains('open'), 'picker opened');

    assert.equal(app.api.openCalDayPick('w_pm'), true);
    assert.equal(app.api.histDetailId, 'w_pm', 'opened that workout detail');
    assert.ok(!app.document.getElementById('calDayModal').classList.contains('open'), 'picker closed');

    assert.equal(app.api.openCalendarDay('2026-10-13'), true, 'single workout skips the picker');
    assert.equal(app.api.histDetailId, 'w_solo');
    assert.equal(app.api.openCalendarDay('2026-10-02'), false, 'untrained day does nothing');
  });

  it('calendar-month-change-shows-the-other-month', () => {
    const app = createApp();
    app.api.state.history = [
      histEntry('w_sep', ts(2026, 8, 8), 'ex1', [loadSet(100, 5)]),
      histEntry('w_oct', ts(2026, 9, 8), 'ex1', [loadSet(100, 5)])
    ];

    app.api.showCalendarMonth(2026, 8);
    assert.equal(app.document.getElementById('calendarTitle').innerText, monthLabel(2026, 8));
    let grid = app.document.getElementById('calendarGrid').innerHTML;
    assert.ok(grid.includes('data-key="2026-09-08"') && grid.includes('cal-day-filled'), 'September day filled');
    assert.ok(!grid.includes('data-key="2026-10-08"'), 'October day not in the September grid');

    app.api.calNextMonth();
    assert.equal(app.document.getElementById('calendarTitle').innerText, monthLabel(2026, 9));
    grid = app.document.getElementById('calendarGrid').innerHTML;
    assert.ok(grid.includes('data-key="2026-10-08"') && grid.includes('cal-day-filled'), 'October day filled');
    assert.ok(!grid.includes('data-key="2026-09-08"'), 'September day gone');

    app.api.calPrevMonth();
    assert.equal(app.document.getElementById('calendarTitle').innerText, monthLabel(2026, 8), 'back to September');
  });

  it('current-unfinished-week-does-not-break-streak', () => {
    const app = createApp();
    // Clock-relative fixture: the card path below reads the REAL clock, so pin
    // the workouts to the two previous COMPLETE weeks instead of a fixed date.
    const nowDate = new Date();
    nowDate.setHours(12, 0, 0, 0);
    const now = nowDate.getTime();
    const weekStart = new Date(app.api.startOfWeekMs(now, 1));
    const prev = (weeks) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7 * weeks); // setDate keeps this DST-safe
      d.setHours(10, 0, 0, 0);
      return d.getTime();
    };
    const history = [
      histEntry('w_prev2', prev(2), 'ex1', [loadSet(100, 5)]),
      histEntry('w_prev1', prev(1), 'ex1', [loadSet(100, 5)])
    ];
    const cons = app.api.computeConsistency(history, now, 1);
    assert.equal(cons.thisWeek, 0, 'nothing this week yet');
    assert.equal(cons.streakWeeks, 2, 'the unfinished current week does not break the run');
    const inThisMonth = history.filter((h) => {
      const hd = new Date(h.date);
      return hd.getFullYear() === nowDate.getFullYear() && hd.getMonth() === nowDate.getMonth();
    }).length;
    assert.equal(cons.thisMonth, inThisMonth, 'this month counts only this month\'s workouts');

    // …and the same run is what the card shows.
    app.api.state.history = history;
    app.api.renderTrainingCalendar();
    const line = app.document.getElementById('calendarConsistency').innerHTML;
    assert.ok(line.includes('Streak 2 weeks'), 'consistency line: ' + line);
  });

  it('missed-earlier-week-ends-streak', () => {
    const app = createApp();
    const now = ts(2026, 9, 14, 12); // current week (12–18 Oct)
    const history = [
      histEntry('w_oct14', ts(2026, 9, 14), 'ex1', [loadSet(100, 5)]), // this week
      histEntry('w_sep30', ts(2026, 8, 30), 'ex1', [loadSet(100, 5)])  // week of 28 Sep; 5–11 Oct missed
    ];
    const cons = app.api.computeConsistency(history, now, 1);
    assert.equal(cons.thisWeek, 1);
    assert.equal(cons.streakWeeks, 1, 'a fully missed earlier week ends the run');

    // Consecutive weeks still count.
    history.push(histEntry('w_oct07', ts(2026, 9, 7), 'ex1', [loadSet(100, 5)]));
    assert.equal(app.api.computeConsistency(history, now, 1).streakWeeks, 3);

    assert.equal(app.api.computeConsistency([], now, 1).streakWeeks, 0, 'no history -> 0');
  });

  it('warmups-not-counted-in-month-workload', () => {
    const app = createApp();
    const chest = addEx(app, 't_chest', 'Chest');
    app.api.state.history = [
      histEntry('w_sep', ts(2026, 8, 8), chest, [warmSet(60, 10), loadSet(100, 5), loadSet(100, 5)])
    ];
    const counts = app.api.muscleWorkloadForMonth(app.api.state.history, app.api.state.exercises, 2026, 8);
    assert.equal(counts.Chest, 2, 'warm-up excluded');

    app.api.renderTrainingCalendar();
    app.api.showCalendarMonth(2026, 8);
    const work = app.document.getElementById('calendarWorkload').innerHTML;
    assert.ok(work.includes('2 sets'), 'month card counts 2 counting sets');
    assert.ok(!work.includes('warm-ups'), 'the note lives in the card header, not in the bars');
    assert.ok(loadIndexHtml().includes('Primary muscle, warm-ups not counted'), 'UI states the counting rule');
  });

  it('workload-uses-primary-muscle-only', () => {
    const app = createApp();
    const ex = addEx(app, 't_bench', 'Chest', ['Back', 'Triceps']);
    app.api.state.history = [histEntry('w1', ts(2026, 8, 8), ex, [loadSet(100, 5), loadSet(100, 5)])];
    const counts = app.api.muscleWorkloadForMonth(app.api.state.history, app.api.state.exercises, 2026, 8);
    assert.equal(counts.Chest, 2, 'primary muscle gets the sets');
    assert.equal(counts.Back, 0, 'secondary muscles never add sets');
    assert.equal(counts.Arms, 0, 'secondary triceps never fold into Arms');

    // Fold rule for a primary that is not a bucket of its own (unchanged).
    const bi = addEx(app, 't_curl', 'Biceps', []);
    app.api.state.history = [histEntry('w2', ts(2026, 8, 9), bi, [loadSet(30, 10), loadSet(30, 10), loadSet(30, 10)])];
    const counts2 = app.api.muscleWorkloadForMonth(app.api.state.history, app.api.state.exercises, 2026, 8);
    assert.equal(counts2.Arms, 3, 'Biceps folds into Arms');
    assert.equal(counts2.Chest, 0);
  });

  it('month-workload-ignores-other-months', () => {
    const app = createApp();
    const chest = addEx(app, 't_chest2', 'Chest');
    app.api.state.history = [
      histEntry('w_aug', ts(2026, 7, 8), chest, [loadSet(100, 5), loadSet(100, 5), loadSet(100, 5)]),
      histEntry('w_sep', ts(2026, 8, 8), chest, [loadSet(100, 5), loadSet(100, 5)]),
      histEntry('w_oct', ts(2026, 9, 8), chest, [loadSet(100, 5)])
    ];
    assert.equal(app.api.muscleWorkloadForMonth(app.api.state.history, app.api.state.exercises, 2026, 8).Chest, 2);
    assert.equal(app.api.muscleWorkloadForMonth(app.api.state.history, app.api.state.exercises, 2026, 9).Chest, 1);
    assert.equal(app.api.muscleWorkloadAllTime(app.api.state.history, app.api.state.exercises).Chest, 6);

    // The chip switches the same card from month to all time.
    app.api.showCalendarMonth(2026, 8);
    assert.equal(app.api.calWorkloadRange, 'month');
    assert.ok(app.document.getElementById('calendarWorkload').innerHTML.includes('2 sets'));
    assert.ok(app.document.getElementById('calWorkloadMonth').className.includes('on'), 'This month chip active');
    app.api.setCalWorkloadRange('all');
    assert.equal(app.api.calWorkloadRange, 'all');
    assert.ok(app.document.getElementById('calendarWorkload').innerHTML.includes('6 sets'), 'all-time total');
    assert.ok(app.document.getElementById('calWorkloadAll').className.includes('on'), 'All time chip active');
    app.api.setCalWorkloadRange('nonsense');
    assert.equal(app.api.calWorkloadRange, 'month', 'unknown range falls back to month');
  });

  it('empty-history-shows-no-workouts-yet', () => {
    const app = createApp();
    app.api.state.history = [];
    app.api.renderProfileStats();
    const grid = app.document.getElementById('calendarGrid').innerHTML;
    assert.ok(grid.includes('No workouts yet'), 'empty state in the calendar');
    const line = app.document.getElementById('calendarConsistency').innerHTML;
    assert.ok(line.includes('This week 0') && line.includes('This month 0') && line.includes('Streak 0 weeks'), 'line: ' + line);
    const work = app.document.getElementById('calendarWorkload').innerHTML;
    assert.ok(work.includes('No sets in this range'), 'empty workload state');
    assert.equal(app.api.openCalendarDay('2026-10-14'), false, 'tapping an empty day is a no-op');
  });

  it('today-is-outlined-and-trained-days-are-filled', () => {
    const app = createApp();
    app.api.state.history = [histEntry('w_today', Date.now(), 'ex1', [loadSet(100, 5)])];
    app.api.renderProfileStats();
    const grid = app.document.getElementById('calendarGrid').innerHTML;
    const today = app.api.dayKeyLocal(Date.now());
    assert.ok(today && grid.includes('data-key="' + today + '"'), 'today cell present');
    assert.ok(grid.includes('cal-day-filled'), 'trained day filled');
    assert.ok(grid.includes('cal-day-today'), 'today outlined');
    assert.ok(grid.includes('box-shadow:0 0 0 3px #a3e635 inset'), 'today ring style');
    assert.ok(grid.includes('openCalendarDay(\'' + today + '\')'), 'today is tappable');
  });

  it('calendar-tap-handlers-compile', () => {
    const app = createApp();
    app.api.state.history = [
      histEntry('w_am', ts(2026, 9, 14, 9), 'ex1', [loadSet(100, 5)]),
      histEntry('w_pm', ts(2026, 9, 14, 18), 'ex1', [loadSet(100, 5)]),
      histEntry('w_sep', ts(2026, 8, 8), 'ex1', [loadSet(100, 5)])
    ];
    app.api.showCalendarMonth(2026, 8);
    app.api.calNextMonth();
    app.api.openCalendarDay('2026-10-14');
    let n = 0;
    ['calendarGrid', 'calendarConsistency', 'calendarWorkload', 'calDayBody'].forEach(id => {
      const html = app.document.getElementById(id).innerHTML || '';
      [...html.matchAll(/onclick="([^"]+)"/g)].forEach(m => { new Function(m[1]); n++; });
    });
    assert.ok(n >= 3, 'generated handlers checked: ' + n);
    app.api.closeCalDay();
    assert.ok(!app.document.getElementById('calDayModal').classList.contains('open'), 'picker closes');
  });

  it('week-start-choice-persists-and-defaults-safely', () => {
    const html = loadIndexHtml();
    assert.ok(html.includes('id="weekStartSelect"'), 'week-start select lives in the Settings card');
    assert.ok(html.includes('<option value="mon">Monday</option>') && html.includes('<option value="sun">Sunday</option>'));

    const app = createApp();
    assert.equal(app.api.getWeekStart(), 'mon', 'safe default without the field');
    app.api.state.weekStart = 'wednesday';
    assert.equal(app.api.getWeekStart(), 'mon', 'invalid value falls back to Monday');

    app.api.setWeekStart('sun');
    assert.equal(app.api.getWeekStart(), 'sun');
    assert.equal(JSON.parse(app.store.get(STATE_KEY)).weekStart, 'sun', 'saved');

    const app2 = createApp({ store: app.store });
    assert.equal(app2.api.getWeekStart(), 'sun', 'survives a reload');

    // Old data / a backup without the field keeps working on the default.
    delete app2.api.state.weekStart;
    app2.api.saveState();
    const app3 = createApp({ store: app.store });
    assert.equal(app3.api.getWeekStart(), 'mon');
    assert.equal(app3.api.computeConsistency(app3.api.state.history, Date.now()).weekStart, 1);
  });

  it('calendar-layout-stays-within-412px-and-40px-cells', () => {
    const app = createApp();
    app.api.state.history = [histEntry('w1', ts(2026, 9, 8), 'ex1', [loadSet(100, 5)])];
    app.api.renderTrainingCalendar();
    const grid = app.document.getElementById('calendarGrid').innerHTML;
    assert.ok(grid.includes('repeat(7, minmax(0, 1fr))'), '7 columns');
    assert.ok((grid.match(/min-height:40px/g) || []).length >= 35, 'every day cell is at least 40px tall');
    assert.ok(grid.includes('max-width:412px'), 'nothing wider than 412px');

    const html = loadIndexHtml();
    assert.ok(html.includes('id="calendarCard" style="max-width:412px;'), 'card capped at 412px');
    assert.ok(html.includes('id="calDayModal"') && html.includes('max-width:412px;'), 'day picker capped too');
  });

  it('history-calendar-button-opens-calendar', () => {
    const html = loadIndexHtml();
    const btn = html.match(/onclick="goToTrainingCalendar\(\)"/);
    assert.ok(btn, 'Calendar button in the History header');
    new Function(btn[0].replace(/^onclick="/, '').replace(/"$/, ''));

    const app = createApp();
    assert.doesNotThrow(() => app.api.goToTrainingCalendar());
    assert.ok(app.document.getElementById('tab-profile').classList.contains('active'), 'lands on the Profile tab');
  });
});
