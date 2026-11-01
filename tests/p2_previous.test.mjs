// tests/p2_previous.test.mjs — P2-07/P2-11 on the REAL app code.
// Same-type lanes (W/W, N/N, D/D, F/F), instance-by-instance matching,
// same-routine scope preference, target-wins prefill, tap-to-copy, units.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, finishWithDrop } from './harness.mjs';

function assertPrevEqual(got, w, r, msg) {
  // Field-wise: objects come from the vm realm, so reference checks are off.
  assert.ok(got, (msg || 'previous set') + ' exists');
  assert.equal(got.weight, w, (msg || 'previous set') + ' weight');
  assert.equal(got.reps, r, (msg || 'previous set') + ' reps');
}

function assertPrevNull(got, msg) {
  assert.equal(got, null, msg || 'no previous set');
}

// Fill ex-0 sets with [type, weight, reps], tick them all, save via drop.
function saveFirstExercise(app, rows) {
  rows.forEach(([type, w, r], i) => {
    const order = ['N', 'W', 'D', 'F'];
    for (let k = 0; k < order.indexOf(type); k++) app.api.cycleSetType(0, i);
    app.api.updateSetVal(0, i, 'weight', String(w));
    app.api.updateSetVal(0, i, 'reps', String(r));
    app.api.toggleSetDone(0, i);
  });
  finishWithDrop(app);
  assert.equal(app.api.state.history.length, 1, 'one history entry saved');
  return app.api.state.history[0];
}

describe('P2-07 same-type matching', () => {
  it('same-type-order-skips-warmup', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    app.api.addSetToActive(0); // 4 sets: W 40x10, N 80x8, 80x8, 80x7
    saveFirstExercise(app, [['W', 40, 10], ['N', 80, 8], ['N', 80, 8], ['N', 80, 7]]);
    const w = app.api.state.history[0];
    assert.equal(JSON.stringify(w.exercises[0].sets.map((s) => s.type)), JSON.stringify(['W', 'N', 'N', 'N']));

    app.api.startRoutineWorkout('rt1'); // 3 fresh Normal sets
    const sets = app.api.activeWorkout.exercises[0].sets;
    assert.equal(JSON.stringify(sets.map((s) => s.weight)), JSON.stringify([80, 80, 80]), 'working sets skip the warm-up');
    assert.equal(JSON.stringify(sets.map((s) => s.reps)), JSON.stringify([8, 8, 7]), 'last 80x7 kept, nothing shifted');
    assertPrevEqual(app.api.getPreviousSet('ex1', 0, 'W', 0, 'rt1'), 40, 10, 'warm-up lane');
    assertPrevEqual(app.api.getPreviousSet('ex1', 2, 'N', 0, 'rt1'), 80, 7, 'third working set');
  });

  it('drop-failure-own-lanes', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    saveFirstExercise(app, [['N', 100, 5], ['D', 90, 6], ['F', 70, 8]]);

    assertPrevEqual(app.api.getPreviousSet('ex1', 0, 'D', 0, 'rt1'), 90, 6, 'drop lane');
    assertPrevEqual(app.api.getPreviousSet('ex1', 0, 'F', 0, 'rt1'), 70, 8, 'failure lane');
    assertPrevNull(app.api.getPreviousSet('ex1', 1, 'N', 0, 'rt1'), 'only one Normal set in history');

    app.api.startRoutineWorkout('rt1');
    const sets = app.api.activeWorkout.exercises[0].sets;
    assert.equal(sets[0].weight, 100, 'first Normal prefilled');
    assert.equal(sets[0].reps, 5);
    assert.equal(sets[1].weight, '', 'no second Normal -> no prefill');
    assert.equal(sets[1].reps, '', 'no second Normal -> no prefill');
  });

  it('repeated-exercise-instance-match', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    app.api.updateSetVal(0, 0, 'weight', '100');
    app.api.updateSetVal(0, 0, 'reps', '5');
    app.api.toggleSetDone(0, 0);
    app.api.activeWorkout.exercises.push({
      exId: 'ex1', restSec: 90,
      sets: [{ type: 'N', weight: 60, reps: 12, done: true }],
    });
    finishWithDrop(app);
    assert.equal(app.api.state.history[0].exercises.filter((e) => e.exId === 'ex1').length, 2);

    assert.equal(app.api.findPreviousExercise('ex1', 0, 'rt1').sets[0].weight, 100);
    assert.equal(app.api.findPreviousExercise('ex1', 1, 'rt1').sets[0].weight, 60);
    assertPrevEqual(app.api.getPreviousSet('ex1', 0, 'N', 1, 'rt1'), 60, 12, 'second instance');
  });

  it('missing-history-dash-no-prefill', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    const sets = app.api.activeWorkout.exercises[0].sets;
    assert.equal(sets[0].weight, '', 'no history -> no prefill');
    assert.equal(sets[0].reps, '', 'no history -> no prefill');
    assert.equal(app.api.getPreviousSet('ex1', 0, 'N', 0, 'rt1'), null);
    assert.equal(app.api.getPreviousSet('nope', 0, 'N', 0, 'rt1'), null);
    assert.equal(app.api.copyPreviousIntoSet(0, 0), false, 'nothing to copy');
  });
});

describe('P2-11 previous-values scope', () => {
  it('scope-same-routine-only', () => {
    const app = createApp();
    assert.equal(app.api.getPrevScope(), 'any', 'default is any workout');
    app.api.startRoutineWorkout('rt1');
    saveFirstExercise(app, [['N', 100, 5]]);

    app.api.setPrevScope('same');
    assert.equal(app.api.getPrevScope(), 'same');
    // Same routine still matches.
    app.api.startRoutineWorkout('rt1');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, 100);
    // A different routine with the same exercise does not.
    app.api.state.routines.push({ id: 'rtX', name: 'Other', exercises: [{ exId: 'ex1', sets: 1 }] });
    app.api.saveState();
    assert.equal(app.api.getPreviousSet('ex1', 0, 'N', 0, 'rtX'), null, 'other routine excluded');
    app.api.discardWorkout();
    app.api.startRoutineWorkout('rtX');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, '', 'no prefill across routines');
    // Any-workout scope matches again.
    app.api.setPrevScope('any');
    assertPrevEqual(app.api.getPreviousSet('ex1', 0, 'N', 0, 'rtX'), 100, 5, 'any scope');
  });

  it('scope-change-keeps-history', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    saveFirstExercise(app, [['N', 100, 5]]);
    const before = JSON.stringify(app.api.state.history);
    app.api.setPrevScope('same');
    app.api.setPrevScope('any');
    assert.equal(JSON.stringify(app.api.state.history), before, 'history bytes untouched by scope changes');
    assert.equal(app.api.state.history[0].exercises[0].sets[0].weight, 100);
  });
});

describe('P2-07 prefill, copy and units', () => {
  it('routine-target-wins-over-previous', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    saveFirstExercise(app, [['N', 100, 5]]);

    app.api.editRoutine('rt1');
    app.api.updateBuilderWeight(0, '60');
    app.api.updateBuilderReps(0, '8-12');
    app.el('routineNameInput').value = 'Push';
    app.api.saveRoutine();

    app.api.startRoutineWorkout('rt1');
    const ex = app.api.activeWorkout.exercises[0];
    assert.equal(ex.sets[0].weight, 60, 'explicit target wins');
    assert.equal(ex.sets[0].reps, '', 'reps left empty when targets exist');
  });

  it('tap-previous-copies-without-tick', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    saveFirstExercise(app, [['N', 100, 5]]);

    app.api.startRoutineWorkout('rt1');
    app.api.updateSetVal(0, 0, 'weight', '');
    app.api.updateSetVal(0, 0, 'reps', '');
    assert.equal(app.api.copyPreviousIntoSet(0, 0), true, 'copied');
    const s = app.api.activeWorkout.exercises[0].sets[0];
    assert.equal(s.weight, 100, 'weight copied');
    assert.equal(s.reps, 5, 'reps copied');
    assert.equal(s.done, false, 'copy never ticks the set');
  });

  it('previous-renders-in-lbs', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    saveFirstExercise(app, [['N', 100, 5]]);
    app.api.toggleUnit();
    assert.equal(app.api.state.unit, 'LBS');

    const prev = app.api.getPreviousSet('ex1', 0, 'N', 0, 'rt1');
    assertPrevEqual(prev, 100, 5, 'lookup stays canonical kg');
    assert.equal(app.api.toDisplayWeight(prev.weight, 'LBS'), 220.5);
    assert.equal(app.api.state.history[0].exercises[0].sets[0].weight, 100, 'stored kg untouched');

    app.api.startRoutineWorkout('rt1');
    app.api.renderActiveWorkout();
    const inner = app.api.activeWorkout.exercises.length
      ? app.el('activeExercisesContainer').children.map((c) => c.innerHTML).join('')
      : '';
    assert.ok(inner.includes('220.5'), 'PREVIOUS shows display lbs');
  });
});
