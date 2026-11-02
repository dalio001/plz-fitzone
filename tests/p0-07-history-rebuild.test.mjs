// tests/p0-07-history-rebuild.test.mjs — P0-07 on the REAL app code.
// Stored totals/PR flags are rebuilt from the sets after any history change;
// an exercise's type is locked once saved workouts use it; renames keep history.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, STATE_KEY } from './harness.mjs';

const DAY = 86400000;
// One stored workout using ex1 with [weight, reps] sets, `daysAgo` days back.
function wk(id, daysAgo, sets, extra) {
  return Object.assign({
    id, title: 'W ' + id, routineId: null, date: Date.now() - daysAgo * DAY, durationSec: 600,
    totalVolume: 0, totalSets: 0, prCount: 0,
    exercises: [{ exId: 'ex1', sets: sets.map(([w, r]) => ({ type: 'N', weight: w, reps: r, done: true })) }]
  }, extra || {});
}
// history is newest-first, like the app stores it.
function appWith(history) {
  const app = createApp();
  app.api.state.history = history;
  app.api.rebuildHistoryDerived(app.api.state.history);
  return app;
}
const byId = (app, id) => app.api.state.history.find(w => w.id === id);
const three = () => [wk('c', 1, [[90, 5]]), wk('b', 2, [[100, 5]]), wk('a', 3, [[80, 5]])];

describe('P0-07 rebuild of stored totals and PRs', () => {
  it('a PR means beating every EARLIER workout, oldest is never a PR', () => {
    const app = appWith(three());
    assert.equal(byId(app, 'a').prCount, 0, 'first workout is the baseline');
    assert.equal(byId(app, 'b').prCount, 1, '100 beats 80');
    assert.equal(byId(app, 'c').prCount, 0, '90 does not beat 100');
    assert.equal(byId(app, 'b').exercises[0].isPR, true);
    assert.equal(byId(app, 'c').exercises[0].isPR, undefined);
  });

  it('deleting the old record workout moves the PR to a later one; undo puts it back', () => {
    const app = appWith(three());
    app.api.askDeleteHist('b');
    app.api.confirmDeleteHist();
    assert.equal(byId(app, 'c').prCount, 1, '90 now beats 80');
    app.api.undoDeleteHist();
    assert.equal(byId(app, 'b').prCount, 1);
    assert.equal(byId(app, 'c').prCount, 0, 'back to no PR');
  });

  it('editing an older workout rebuilds later workouts and its own totals', () => {
    const app = appWith(three());
    app.api.openHistEdit('b');
    app.api.updateHistSetVal(0, 0, 'weight', '70');
    assert.equal(app.api.saveHistEdit(), true);
    assert.equal(byId(app, 'b').prCount, 0, '70 is not a PR');
    assert.equal(byId(app, 'b').totalVolume, 350, 'volume follows the edit');
    assert.equal(byId(app, 'c').prCount, 1, '90 is now a PR over 80');
  });

  it('editing an OLD workout is not compared with later workouts', () => {
    // b beats the earlier a; the later c is bigger. The old scorer compared b with c too.
    const app = appWith([wk('c', 1, [[120, 5]]), wk('b', 2, [[100, 5]]), wk('a', 3, [[80, 5]])]);
    app.api.openHistEdit('b');
    app.api.updateHistSetVal(0, 0, 'reps', '6');
    app.api.saveHistEdit();
    assert.equal(byId(app, 'b').prCount, 1, 'still a PR over the earlier 80');
  });

  it('same history gives the same result; a second run changes nothing', () => {
    const app = appWith(three());
    const once = JSON.stringify(app.api.state.history);
    assert.equal(app.api.rebuildHistoryDerived(app.api.state.history), false);
    assert.equal(JSON.stringify(app.api.state.history), once);
  });

  it('stale stored numbers are fixed on load', () => {
    const store = new Map();
    const seed = createApp({ store });
    seed.api.state.history = [wk('b', 1, [[100, 5]], { prCount: 7, totalVolume: 1 }), wk('a', 2, [[80, 5]], { prCount: 3 })];
    seed.api.saveState();
    const app = createApp({ store });
    assert.equal(byId(app, 'b').prCount, 1);
    assert.equal(byId(app, 'b').totalVolume, 500);
    assert.equal(byId(app, 'a').prCount, 0);
    assert.equal(JSON.parse(store.get(STATE_KEY)).history.find(w => w.id === 'b').prCount, 1, 'fix is saved');
  });

  it('sets with bad values never throw', () => {
    const app = createApp();
    app.api.state.history = [{ id: 'x', date: 'bad', exercises: [{ exId: 'nope', sets: [{ weight: 'a', reps: null }] }, null] }, null];
    assert.doesNotThrow(() => app.api.rebuildHistoryDerived(app.api.state.history));
    assert.equal(app.api.state.history[0].totalVolume, 0);
  });
});

describe('P0-07 exercise edits keep history meaning', () => {
  function addCustom(app, id, name, type) {
    app.api.state.exercises.unshift({ id, name, equipment: 'Cable', muscle: 'Glutes', primary: 'Glutes', secondary: [], type, custom: true, fav: false, hidden: false });
  }

  it('type is locked with a note when saved workouts use the exercise; rename still works', () => {
    const app = createApp();
    addCustom(app, 'ex_c1', 'Cable Hip Thrust', 'weight_reps');
    app.api.state.history.unshift({ id: 'h1', title: 'Legs', date: Date.now() - DAY, durationSec: 60, exercises: [{ exId: 'ex_c1', sets: [{ type: 'N', weight: 40, reps: 10, done: true }] }] });
    app.api.openCustomExModal('ex_c1');
    assert.equal(app.el('newExType').disabled, true);
    assert.ok(app.el('newExTypeNote').textContent.includes('used in 1 workout'));
    app.el('newExType').value = 'duration';
    app.el('newExName').value = 'Hip Thrust (cable)';
    assert.equal(app.api.saveCustomExercise(), true);
    const ex = app.api.state.exercises.find(e => e.id === 'ex_c1');
    assert.equal(ex.type, 'weight_reps', 'type unchanged');
    assert.equal(ex.name, 'Hip Thrust (cable)', 'rename allowed');
    assert.equal(app.api.state.history[0].exercises[0].exId, 'ex_c1', 'history still points at the same exercise');
  });

  it('an unused exercise can still change type', () => {
    const app = createApp();
    addCustom(app, 'ex_c2', 'Plank X', 'weight_reps');
    app.api.openCustomExModal('ex_c2');
    assert.equal(app.el('newExType').disabled, false);
    app.el('newExType').value = 'duration';
    app.api.saveCustomExercise();
    assert.equal(app.api.state.exercises.find(e => e.id === 'ex_c2').type, 'duration');
  });

  it('renaming a routine never changes saved workout titles', () => {
    const app = createApp();
    app.api.state.routines.push({ id: 'rt1', name: 'Push A', exercises: [] });
    app.api.state.history.unshift({ id: 'h2', title: 'Push A', routineId: 'rt1', date: Date.now() - DAY, durationSec: 60, exercises: [{ exId: 'ex1', sets: [{ type: 'N', weight: 50, reps: 5, done: true }] }] });
    app.api.state.routines.find(r => r.id === 'rt1').name = 'Push B';
    app.api.rebuildHistoryDerived(app.api.state.history);
    assert.equal(app.api.state.history[0].title, 'Push A');
  });
});

describe('one state clean-up for every way a state arrives', () => {
  it('undo-restore fixes the settings it used to skip', () => {
    const store = new Map();
    const app = createApp({ store });
    store.set('hevy_clone_state_before_restore', JSON.stringify({
      exercises: app.api.state.exercises, routines: [], history: [wk('b', 1, [[100, 5]], { prCount: 9 }), wk('a', 2, [[80, 5]])],
      dropStepPct: 7, supersetAdvance: 'yes', plateSettings: 'bad'
    }));
    app.api.undoLastRestore();
    assert.equal(app.api.state.dropStepPct, 20);
    assert.equal(app.api.state.supersetAdvance, true);
    assert.equal(typeof app.api.state.plateSettings, 'object');
    assert.equal(byId(app, 'b').prCount, 1, 'history rebuilt too');
  });

  it('sync drops broken plans and rebuilds history', () => {
    const app = createApp();
    app.api.applyPulledState({ plans: { notADay: { routineId: 'rt1' } }, history: [wk('b', 1, [[100, 5]], { prCount: 4 }), wk('a', 2, [[80, 5]])] }, 'app', '');
    assert.equal(Object.keys(app.api.state.plans).length, 0, 'invalid day key dropped');
    assert.equal(byId(app, 'b').prCount, 1);
  });

  it('running it twice changes nothing', () => {
    const app = appWith(three());
    app.api.normalizeStateShape();
    const once = JSON.stringify(app.api.state);
    app.api.normalizeStateShape();
    assert.equal(JSON.stringify(app.api.state), once);
  });
});

describe('B2/B3: one rule for 1RM, PRs and volume (same as Records)', () => {
  it('warm-up sets never add volume or earn a PR', () => {
    const later = wk('b', 1, [[60, 5]]);
    later.exercises[0].sets.unshift({ type: 'W', weight: 200, reps: 5, done: true });
    const app = appWith([later, wk('a', 2, [[100, 5]])]);
    assert.equal(byId(app, 'b').totalVolume, 300, 'only the 60x5 working set counts');
    assert.equal(byId(app, 'b').totalSets, 2, 'the set count still shows every set');
    assert.equal(byId(app, 'b').prCount, 0, 'a heavy warm-up is not a PR');
    assert.ok(Math.abs(app.api.getBest1RM('ex1') - 100 * (1 + 5 / 30)) < 1e-9, 'best 1RM ignores the warm-up');
  });

  it('a set over 12 reps adds volume but never a 1RM or PR', () => {
    const app = appWith([wk('b', 1, [[80, 20]]), wk('a', 2, [[90, 5]])]);
    assert.equal(byId(app, 'b').totalVolume, 1600);
    assert.equal(byId(app, 'b').prCount, 0, '80x20 is not compared as a 1RM');
    assert.ok(Math.abs(app.api.getBest1RM('ex1') - 90 * (1 + 5 / 30)) < 1e-9);
  });

  it('the saved PR flag agrees with the Records best 1RM', () => {
    const app = appWith([wk('c', 1, [[95, 5]]), wk('b', 2, [[80, 20]]), wk('a', 3, [[90, 5]])]);
    const rec = app.api.exerciseRecords('ex1');
    assert.equal(rec.bestE1RM.histId, 'c');
    assert.equal(byId(app, 'c').prCount, 1);
    assert.ok(Math.abs(app.api.getBest1RM('ex1') - rec.bestE1RM.valueKg) < 1e-9);
  });
});
