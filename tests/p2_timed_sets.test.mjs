// tests/p2_timed_sets.test.mjs — P2-12 timed sets on the REAL app code.
// Duration exercises (Plank ex60, Farmer Carry ex94, ...) log a hold time
// instead of reps: helpers, validation, save/finish, the live row + stopwatch,
// target, previous time, records and the history views.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, DRAFT_KEY, STATE_KEY } from './harness.mjs';

const PLANK = 'ex60';        // Bodyweight duration
const CARRY = 'ex94';        // Dumbbell duration (optional kg)

function startPlank(app) {
  app.api.startEmptyWorkout();
  app.api.addExerciseToWorkout(PLANK);
  return app;
}

function savePlank(app, secs) {
  startPlank(app);
  app.api.updateSetDuration(0, 0, String(secs));
  app.api.toggleSetDone(0, 0);
  app.api.finishWorkout();
  if (app.api.finishReviewPending) app.api.finishReviewDrop();
  return app.api.state.history[0];
}

describe('P2-12 helpers', () => {
  it('parses and formats a hold time', () => {
    const app = createApp();
    assert.equal(app.api.parseDurationInput('1:05'), 65, '1:05 -> 65 s');
    assert.equal(app.api.parseDurationInput('65'), 65, 'bare seconds kept');
    assert.equal(app.api.parseDurationInput('0:30'), 30);
    assert.equal(app.api.parseDurationInput('1:'), 60, 'typing 1: is still 1 minute');
    assert.equal(app.api.parseDurationInput('2:5'), 125, 'one-digit seconds accepted');
    assert.equal(app.api.parseDurationInput(''), null, 'empty is not a value');
    assert.equal(app.api.parseDurationInput('abc'), null, 'not a time');

    assert.equal(app.api.formatDurationClock(65), '1:05');
    assert.equal(app.api.formatDurationClock(9), '0:09');
    assert.equal(app.api.formatDurationClock(3600), '1:00:00');
    assert.equal(app.api.formatDurationClock(3665), '1:01:05');

    assert.equal(app.api.getDurationError(65), '');
    assert.ok(app.api.getDurationError(''), 'empty is an error');
    assert.ok(app.api.getDurationError(0), 'zero is an error');
    assert.ok(app.api.getDurationError(app.api.SET_MAX_DURATION_SEC + 1), 'over a day is an error');
  });

  it('durationCountingSets skips warm-ups and useless holds', () => {
    const app = createApp();
    const sets = [
      { type: 'W', durationSec: 30, done: true },
      { type: 'N', durationSec: 65, weight: 20, done: true },
      { type: 'N', durationSec: 0, done: true },
      { type: 'D', durationSec: 45, done: true },
      { type: 'N', reps: 10, weight: 0, done: true },
    ];
    const out = app.api.durationCountingSets(sets);
    assert.equal(out.length, 2, 'warm-up, zero hold and a reps set are not holds');
    assert.equal(out[0].durationSec, 65);
    assert.equal(out[0].weight, 20);
    assert.equal(out[1].type, 'D', 'drop holds count');
    assert.equal(JSON.stringify(app.api.metricCountingSets(sets).map(s => s.reps)), JSON.stringify([10]), 'reps metric untouched by holds');
  });

  it('isSetTickable keeps its old 1-arg meaning and accepts a duration type', () => {
    const app = createApp();
    assert.equal(app.api.isSetTickable({ weight: 100, reps: 5 }), true, 'old reps call still valid');
    assert.equal(app.api.isSetTickable({ weight: 100, reps: '' }), false, 'old reps call still rejects');
    const app2 = createApp();
    const plank = app2.api.state.exercises.find(e => e.id === PLANK);
    assert.equal(plank.type, 'duration', 'plank really is a duration exercise');
    assert.equal(app2.api.isSetTickable({ type: 'N', durationSec: 65, weight: '' }, 'duration'), true, 'a hold is tickable');
    assert.equal(app2.api.isSetTickable({ type: 'N', durationSec: 65 }, 'weight_reps'), false, 'reps exercise still needs reps');
    assert.equal(app2.api.isSetTickable({ type: 'N', durationSec: '' , weight: '' }, 'duration'), false, 'no time, no tick');
    assert.equal(app2.api.setUsesDuration({ reps: 60, weight: 0 }, 'duration'), false, 'legacy reps plank row is never reinterpreted');
  });
});

describe('P2-12 save and finish', () => {
  it('duration workout saves durationSec and counts as a set', () => {
    const app = createApp();
    const w = savePlank(app, 65);
    assert.equal(app.api.state.history.length, 1, 'a plank-only workout can be saved');
    const item = w.exercises[0];
    assert.equal(item.exId, PLANK);
    assert.equal(item.sets.length, 1);
    assert.equal(item.sets[0].durationSec, 65, 'the hold time is stored');
    assert.equal(item.sets[0].reps, undefined, 'no invented reps');
    assert.equal(item.sets[0].timerStartedAt, undefined, 'timer bookkeeping dropped');
    assert.equal(w.totalSets, 1, 'the hold counts as one set');
    assert.equal(w.totalVolume, 0, 'no fabricated volume');
    assert.equal(w.prCount, 0, 'no fabricated PR');
  });

  it('a plank with no time is not tickable and cannot be finished', () => {
    const app = startPlank(createApp());
    assert.equal(app.api.toggleSetDone(0, 0), false, 'empty time refuses the tick');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].done, false);
    assert.ok(app.api.setInputErrors['0:0']?.duration, 'row error names the time');
    app.api.finishWorkout();
    assert.equal(app.api.state.history.length, 0, 'nothing saved');
    assert.equal(app.alerts.length, 1, 'existing message kept');
    assert.match(app.alerts[0], /Complete at least one set/);
  });

  it('farmer carry keeps optional kg with the hold time', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout(CARRY);
    app.api.updateSetVal(0, 0, 'weight', '24');
    app.api.updateSetDuration(0, 0, '40');
    app.api.toggleSetDone(0, 0);
    app.api.finishWorkout();
    if (app.api.finishReviewPending) app.api.finishReviewDrop();
    const s = app.api.state.history[0].exercises[0].sets[0];
    assert.equal(s.durationSec, 40, 'hold kept');
    assert.equal(s.weight, 24, 'real load kept');
    assert.equal(s.reps, undefined, 'reps dropped');
    assert.equal(app.api.durationSetAllowsWeight(app.api.state.exercises.find(e => e.id === CARRY)), true, 'carry shows the kg box');
    assert.equal(app.api.durationSetAllowsWeight(app.api.state.exercises.find(e => e.id === PLANK)), false, 'plank does not');

    // A stored invalid load is a field error, so such a set would not tick
    // (invalid values are never stored by the live logger, so this is the
    // guard the model exposes for old/odd data).
    assert.ok(app.api.setFieldErrorsFor({ type: 'N', durationSec: 30, weight: -5 }, 'duration').weight, 'a bad stored load is a field error');
    assert.equal(app.api.isSetTickable({ type: 'N', durationSec: 30, weight: -5 }, 'duration'), false, 'a bad stored load blocks the tick');

    // The live carry row: a typed-in invalid kg is refused (never written to
    // the set), and the hold alone still ticks.
    const app2 = createApp();
    app2.api.startEmptyWorkout();
    app2.api.addExerciseToWorkout(CARRY);
    app2.api.updateSetVal(0, 0, 'weight', '-5');
    assert.equal(app2.api.activeWorkout.exercises[0].sets[0].weight, '', 'an invalid kg is never stored');
    assert.ok(app2.api.setInputErrors['0:0'] && app2.api.setInputErrors['0:0'].weight, 'the row shows the kg error');
    app2.api.updateSetDuration(0, 0, '30');
    assert.equal(app2.api.toggleSetDone(0, 0), true, 'a carry with a hold and no kg ticks');
  });

  it('history edit keeps the hold time and never zeroes it', () => {
    const app = createApp();
    const w = savePlank(app, 90);
    app.api.openHistEdit(w.id);
    assert.equal(app.api.editingHistDraft.exercises[0].sets[0].durationSec, 90, 'edit draft carries the time');
    app.api.updateHistSetVal(0, 0, 'duration', '1:20');
    app.api.saveHistEdit();
    assert.equal(app.api.state.history[0].exercises[0].sets[0].durationSec, 80, 'edited time saved');
    assert.equal(app.api.state.history[0].exercises[0].sets[0].reps, undefined, 'no reps invented');
    assert.equal(app.api.state.history[0].totalVolume, 0, 'volume stays zero');

    app.api.openHistEdit(w.id);
    assert.equal(app.api.updateHistSetVal(0, 0, 'duration', 'nope'), false, 'an unusable time is refused');
    assert.equal(app.api.editingHistDraft.exercises[0].sets[0].durationSec, 80, 'and never written to the draft');
    assert.ok(app.api.histEditErrors['0:0'] && app.api.histEditErrors['0:0'].duration, 'the row shows the time error');

    app.api.openHistEdit(w.id);
    app.api.editingHistDraft.exercises[0].sets[0].durationSec = '';
    assert.equal(app.api.saveHistEdit(), false, 'a missing time blocks the save');
    assert.equal(app.api.state.history[0].exercises[0].sets[0].durationSec, 80, 'stored time untouched by a failed save');
    assert.match(app.alerts[app.alerts.length - 1], /Fix the highlighted sets/);
  });
});

describe('P2-12 records from holds', () => {
  it('duration records are longest hold, never e1RM or volume', () => {
    const app = createApp();
    savePlank(app, 45);
    savePlank(app, 95);
    const recs = app.api.exerciseRecords(PLANK);
    assert.ok(recs.longestHold, 'a longest hold exists');
    assert.equal(recs.longestHold.durationSec, 95, 'the longest hold wins');
    assert.equal(recs.bestE1RM, null, 'no est. 1RM from a hold');
    assert.equal(recs.bestSetVolume, null, 'no set volume from a hold');
    assert.equal(recs.bestSessionVolume, null, 'no session volume from a hold');
    assert.equal(recs.mostRepsInSet, null, 'no rep record from a hold');
    assert.equal(JSON.stringify(recs.repRecords), '{}', 'no rep records from a hold');
    assert.equal(recs.heaviestWeight, null, 'no invented kg on a bodyweight plank');

    assert.equal(app.api.getBest1RM(PLANK), 0, 'no est. 1RM for the exercise either');
    const sessions = app.api.exerciseSessions(PLANK);
    assert.equal(sessions.length, 2, 'both sessions listed');
    assert.equal(sessions[1].longestHold, 95, 'session longest hold');
    assert.equal(sessions[1].totalTime, 95, 'session total time');
    assert.equal(sessions[1].points.longestHold, 95);
  });

  it('farmer carry reports the hold and the real kg, not a fabricated PR', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout(CARRY);
    app.api.updateSetVal(0, 0, 'weight', '24');
    app.api.updateSetDuration(0, 0, '40');
    app.api.toggleSetDone(0, 0);
    app.api.finishWorkout();
    if (app.api.finishReviewPending) app.api.finishReviewDrop();
    const recs = app.api.exerciseRecords(CARRY);
    assert.equal(recs.longestHold.durationSec, 40);
    assert.equal(recs.longestHold.weightKg, 24, 'the carried kg is attached to the hold');
    assert.equal(recs.heaviestWeight.valueKg, 24, 'heaviest real load kept');
    assert.equal(recs.bestE1RM, null, 'no e1RM from a carry');
    const w = app.api.state.history[0];
    assert.equal(w.totalVolume, 0, 'a carry has no fabricated volume');
    assert.equal(w.prCount, 0, 'and no fabricated PR');
  });
});

describe('P2-12 stored data compatibility', () => {
  it('restore keeps durationSec from a backup', () => {
    const store = new Map();
    const app = createApp({ store });
    savePlank(app, 120);
    app.api.state.history[0].exercises[0].sets[0].durationSec = 120;
    app.api.saveState();
    const before = store.get(STATE_KEY);

    const app2 = createApp({ store });
    assert.equal(app2.api.state.history[0].exercises[0].sets[0].durationSec, 120, 'hold survives a reload');
    app2.api.saveState();
    assert.ok(store.get(STATE_KEY).includes('"durationSec":120'), 'the value is really stored on disk');
    assert.ok(before.includes('"durationSec":120'));
  });

  it('draft round-trips a running timer', () => {
    const store = new Map();
    const app = startPlank(createApp({ store }));
    assert.equal(app.api.saveActiveSession(), undefined, 'draft persisted when asked');
    const draft = JSON.parse(store.get(DRAFT_KEY));
    assert.equal(draft.exercises[0].sets[0].reps, undefined, 'no reps box invented for a plank row');
    assert.equal(draft.exercises[0].sets[0].durationSec, '', 'time starts empty');

    // A running clock + target are on the set, so they survive the reload.
    const live = app.api.activeWorkout.exercises[0].sets[0];
    live.timerStartedAt = Date.now() - 65000;
    live.targetSec = 90;
    app.api.saveActiveSession();

    const app2 = createApp({ store });
    app2.api.resumeSavedWorkout();
    const s2 = app2.api.activeWorkout.exercises[0].sets[0];
    assert.equal(typeof s2.timerStartedAt, 'number', 'the running clock survives the reload');
    assert.equal(s2.targetSec, 90, 'the target survives');
    assert.equal(app2.api.setElapsedSec(s2, s2.timerStartedAt + 65000), 65, 'and still counts from its real start');
    assert.equal(app2.api.runningSetTimer() !== null, true, 'one set is still running after resume');
  });
});

describe('P2-12 the live row and its stopwatch', () => {
  function rowHtml(app) {
    return app.el('activeExercisesContainer').children.map((c) => c.innerHTML).join('');
  }

  it('a duration row shows time, Start and the previous hold, never reps', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout(PLANK);
    app.api.renderActiveWorkout();
    const html = rowHtml(app);
    assert.ok(html.includes('id="set-time-0-0"'), 'the time box is the field');
    assert.ok(html.includes('toggleSetTimer(0, 0)'), 'Start/Stop sits on the row');
    assert.ok(!html.includes('id="set-r-0-0"'), 'no reps box for a plank');
    assert.ok(html.includes('>TIME<'), 'the column header says TIME');
  });

  it('typing a time never rebuilds the row (focus survives) and parses 1:05', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout(PLANK);
    app.api.renderActiveWorkout();
    const before = rowHtml(app);
    const ok = app.api.updateSetDuration(0, 0, '1:05');
    assert.equal(ok, true, 'a good time is accepted');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].durationSec, 65, 'stored as seconds');
    assert.equal(rowHtml(app), before, 'the row HTML is untouched while typing');
  });

  it('Start runs one clock, Stop fills the time and ticks the set', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout(PLANK);
    assert.equal(app.api.startSetTimer(0, 0), true, 'the clock starts');
    assert.equal(app.api.runningSetTimer().exIdx, 0);
    const s = app.api.activeWorkout.exercises[0].sets[0];
    // Simulate 65 s elapsed without timers.
    s.timerStartedAt = Date.now() - 65000;
    assert.equal(Math.floor(app.api.setElapsedSec(s)), 65, 'elapsed is read live');
    app.api.paintRunningSetClocks();
    assert.equal(app.api.toggleSetTimer(0, 0), true, 'Stop ticks through the normal path');
    assert.equal(s.durationSec, 65, 'Stop writes the measured time');
    assert.equal(s.done, true, 'and the set is ticked');
    assert.equal(s.timerStartedAt, undefined, 'the clock is over');
    assert.equal(app.api.runningSetTimer(), null, 'nothing is running');
  });

  it('starting another set fills but does not tick the first (one clock only)', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout(PLANK);
    app.api.addSetToActive(0);
    app.api.startSetTimer(0, 0);
    app.api.activeWorkout.exercises[0].sets[0].timerStartedAt = Date.now() - 40000;
    app.api.startSetTimer(0, 1);
    const first = app.api.activeWorkout.exercises[0].sets[0];
    const second = app.api.activeWorkout.exercises[0].sets[1];
    assert.equal(first.durationSec, 40, 'the first hold is filled from its real start');
    assert.equal(first.done, false, 'but starting another set never ticks it');
    assert.equal(typeof second.timerStartedAt, 'number', 'the new clock runs');
    const running = app.api.runningSetTimer();
    assert.equal(running.sIdx, 1, 'exactly one set runs at a time');
  });

  it('the target turns green and vibrates once per run', () => {
    const calls = [];
    const app = createApp({ navigator: { vibrate: (ms) => { calls.push(ms); return true; } } });
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout(PLANK);
    app.api.startSetTimer(0, 0);
    const s = app.api.activeWorkout.exercises[0].sets[0];
    s.targetSec = 60;
    s.timerStartedAt = Date.now() - 59000;
    app.api.paintRunningSetClocks();
    assert.equal(calls.length, 0, 'not yet at the target');
    s.timerStartedAt = Date.now() - 61000;
    app.api.paintRunningSetClocks();
    assert.equal(calls.length, 1, 'vibrates once at the target');
    app.api.paintRunningSetClocks();
    app.api.paintRunningSetClocks();
    assert.equal(calls.length, 1, 'never a second buzz on the same run');
    assert.ok(app.el('set-time-0-0').classList.contains('time-target'), 'the box is marked green');
    // A new run may vibrate again.
    app.api.toggleSetTimer(0, 0); // Stop
    app.api.startSetTimer(0, 0);
    const s2 = app.api.activeWorkout.exercises[0].sets[0];
    s2.targetSec = 60;
    s2.timerStartedAt = Date.now() - 61000;
    app.api.paintRunningSetClocks();
    assert.equal(calls.length, 2, 'a fresh run can buzz again');
  });

  it('no navigator.vibrate is fine, and the rest timer still starts after a hold', () => {
    const app = createApp(); // navigator = {}
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout(PLANK);
    app.api.startSetTimer(0, 0);
    const s = app.api.activeWorkout.exercises[0].sets[0];
    s.targetSec = 10;
    s.timerStartedAt = Date.now() - 11000;
    assert.equal(app.api.paintRunningSetClocks() >= 1, true, 'painting does not throw without vibrate');
    assert.equal(app.api.restDeadline, null, 'a running clock starts no rest');
    app.api.toggleSetTimer(0, 0); // Stop ticks and starts the rest timer
    assert.equal(s.done, true);
    assert.equal(typeof app.api.restDeadline, 'number', 'rest starts after the hold is ticked');
    assert.ok(app.api.restDeadline > Date.now(), 'the rest deadline is in the future');
  });
});

describe('P2-12 previous time, routines, history and progress', () => {
  function rowHtml(app) {
    return app.el('activeExercisesContainer').children.map((c) => c.innerHTML).join('');
  }

  it('the PREVIOUS cell offers the last hold and tapping fills the time', () => {
    const app = createApp();
    savePlank(app, 80);
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout(PLANK);
    app.api.renderActiveWorkout();
    assert.ok(rowHtml(app).includes('1:20'), 'the previous hold shows under PREVIOUS');
    app.api.copyPreviousIntoSet(0, 0);
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].durationSec, 80, 'tapping copies the time');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].reps, undefined, 'and never invents reps');
  });

  it('a duration routine row shows a target time instead of reps and weight', () => {
    const app = createApp();
    app.api.openRoutineBuilder();
    app.api.tempRoutineExercises.push(app.api.normalizeRoutineItem({ exId: PLANK, sets: 3 }));
    app.api.tempRoutineExercises.push(app.api.normalizeRoutineItem({ exId: 'ex1', sets: 3 }));
    app.api.renderRoutineBuilderList();
    const html = app.el('routineBuilderExList').innerHTML;
    assert.ok(html.includes('updateBuilderDuration(0'), 'the plank row has a target time');
    assert.ok(!html.includes('updateBuilderReps(0'), 'and no reps input');
    assert.ok(html.includes('updateBuilderReps(1'), 'a weight exercise keeps its reps input');
    app.api.updateBuilderDuration(0, '1:30');
    assert.equal(app.api.tempRoutineExercises[0].targetDurationSec, 90, 'a clock time is stored as seconds');
    app.api.updateBuilderDuration(0, 'nonsense');
    assert.equal(app.api.tempRoutineExercises[0].targetDurationSec, null, 'a bad time clears the target');
    app.api.updateBuilderDuration(0, '');
    assert.equal(app.api.tempRoutineExercises[0].targetDurationSec, null, 'blank means no target');
  });

  it('a routine target rides on the set; without one the last hold pre-fills', () => {
    const app = createApp();
    savePlank(app, 75);
    app.api.openRoutineBuilder();
    app.api.tempRoutineExercises.push(app.api.normalizeRoutineItem({ exId: PLANK, sets: 2, targetDurationSec: 120 }));
    app.el('routineNameInput').value = 'Plank Target';
    app.api.saveRoutine();
    app.api.openRoutineBuilder();
    app.api.tempRoutineExercises.push(app.api.normalizeRoutineItem({ exId: PLANK, sets: 1 }));
    app.el('routineNameInput').value = 'Plank Prefill';
    app.api.saveRoutine();
    const target = app.api.state.routines.find(r => r.name === 'Plank Target');
    const prefill = app.api.state.routines.find(r => r.name === 'Plank Prefill');
    // Routine ids are 'rt_' + Date.now(); two saves in the same millisecond
    // collide, so give these two fixed ids to keep the test deterministic.
    target.id = 'rt_test_plank_target';
    prefill.id = 'rt_test_plank_prefill';
    assert.equal(target.exercises[0].targetDurationSec, 120, 'the target is saved on the routine');

    app.api.startRoutineWorkout(target.id);
    const sTarget = app.api.activeWorkout.exercises[0].sets[0];
    assert.equal(sTarget.targetSec, 120, 'the target rides on the set');
    assert.equal(sTarget.durationSec, '', 'a target means no pre-filled time');
    assert.equal(sTarget.reps, undefined, 'no reps column on a hold');
    app.api.discardWorkout();

    app.api.startRoutineWorkout(prefill.id);
    const sPre = app.api.activeWorkout.exercises[0].sets[0];
    assert.equal(sPre.targetSec, undefined, 'no target without one');
    assert.equal(sPre.durationSec, 75, 'the last hold pre-fills');
  });

  it('history list and detail show the hold time, never a fake reps value', () => {
    const app = createApp();
    const w = savePlank(app, 95);
    app.api.renderHistory();
    assert.ok(app.el('historyList').innerHTML.includes('Best: 1:35'), 'the list shows the best hold');
    app.api.openHistDetail(w.id);
    const detail = app.el('histDetailBody').innerHTML;
    assert.ok(detail.includes('1:35'), 'the detail shows the hold');
    assert.ok(!detail.includes('× undefined'), 'never a reps value for a hold');
    assert.ok(!detail.includes('0 KG ×'), 'never a fabricated zero-load row');
  });

  it('the history edit row edits the time and writes it back', () => {
    const app = createApp();
    const w = savePlank(app, 60);
    app.api.openHistEdit(w.id);
    const html = app.el('histEditBody').innerHTML;
    assert.ok(html.includes('id="hist-st-0-0"'), 'a time box in the edit row');
    assert.ok(!html.includes('id="hist-sr-0-0"'), 'and no reps box');
    assert.equal(app.api.updateHistSetVal(0, 0, 'duration', '1:10'), true, 'a good time is accepted');
    assert.equal(app.api.saveHistEdit(), true, 'the edit saves');
    assert.equal(app.api.state.history[0].exercises[0].sets[0].durationSec, 70, 'the edited time is stored');
    assert.equal(app.api.state.history[0].exercises[0].sets[0].reps, undefined, 'still no reps');
    assert.equal(app.api.state.history[0].totalVolume, 0, 'volume stays zero');
  });

  it('repeating a past workout pre-fills the time, not reps', () => {
    const app = createApp();
    const w = savePlank(app, 60);
    app.api.doStartHistWorkout(w.id);
    const s = app.api.activeWorkout.exercises[0].sets[0];
    assert.equal(s.durationSec, 60, 'the time pre-fills');
    assert.equal(s.reps, undefined, 'no reps column invented');
    app.api.renderActiveWorkout();
    assert.ok(rowHtml(app).includes('value="1:00"'), 'and the row shows 1:00');
  });

  it('the progress page charts holds and lists a longest-hold record', () => {
    const app = createApp();
    savePlank(app, 45);
    savePlank(app, 95);
    app.api.openExerciseProgress(PLANK, 'test');
    const model = app.api.exerciseProgressModel(PLANK);
    assert.equal(model.records.longestHold.durationSec, 95, 'longest hold record');
    assert.equal(model.records.bestE1RM, null, 'no invented 1RM');
    assert.equal(app.api.progressMetric, 'longestHold', 'a timed exercise opens on its hold chart');
    const html = app.el('exProgressBody').innerHTML;
    assert.ok(html.includes('Longest hold'), 'the records card names the hold');
    assert.ok(html.includes('1:35'), 'and shows the time');
    assert.ok(html.includes('Session time'), 'a session-time metric button exists');
    assert.ok(!html.includes('Best est. 1RM'), 'never a fake 1RM record');
    app.api.setProgressMetric('totalTime');
    const html2 = app.el('exProgressBody').innerHTML;
    assert.ok(html2.includes('Total time — time'), 'the session-time chart is labelled as time');
  });

  it('profile records list a timed exercise as a hold', () => {
    const app = createApp();
    savePlank(app, 95);
    app.api.renderProfileRecords();
    const html = app.el('profileRecords').innerHTML;
    assert.ok(html.includes('Plank'), 'the plank appears');
    assert.ok(html.includes('1:35'), 'with its longest hold');
    assert.ok(html.includes('(hold)'), 'labelled as a hold');
  });

  it('a plank session counts as a set under Core; warm-up holds never count', () => {
    const app = createApp();
    savePlank(app, 60);
    const real = app.api.muscleWorkloadAllTime(app.api.state.history, app.api.state.exercises);
    assert.equal(real.Core, 1, 'one hold counts as one set');

    const synth = [{ id: 'w1', date: Date.now(), exercises: [{ exId: PLANK, sets: [
      { type: 'W', durationSec: 30, done: true },
      { type: 'N', durationSec: 40, done: true },
      { type: 'N', durationSec: 50, done: true }
    ] }] }];
    const counts = app.api.muscleWorkloadAllTime(synth, app.api.state.exercises);
    assert.equal(counts.Core, 2, 'the warm-up hold is excluded');

    const reps = [{ id: 'w2', date: Date.now(), exercises: [{ exId: 'ex1', sets: [{ type: 'N', weight: 100, reps: 5, done: true }] }] }];
    assert.equal(app.api.muscleWorkloadAllTime(reps, app.api.state.exercises).Chest, 1, 'reps sets count exactly as before');
  });
});
