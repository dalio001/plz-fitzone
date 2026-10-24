// tests/restore.test.mjs — safe restore on the REAL app code.
// 5. Restore: junk rejected and nothing changes; bad weight/negative
//    reps/unknown exercise rejected; valid backup gives correct preview
//    counts; restore + undo returns the exact previous data; empty routines
//    stay empty; true first run seeds defaults.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createApp, STATE_KEY, DRAFT_KEY, BEFORE_RESTORE_KEY,
} from './harness.mjs';

function baseBackup() {
  return {
    schemaVersion: 2,
    unit: 'KG',
    defaultRest: 90,
    exercises: [{ id: 'ex1', name: 'Bench Press (Barbell)', muscle: 'Chest' }],
    routines: [],
    history: [],
  };
}

function workoutBackup() {  const d1 = Date.UTC(2026, 8, 1, 10, 0, 0);
  const d2 = Date.UTC(2026, 9, 10, 18, 30, 0);
  const b = baseBackup();
  b.exercises.push({ id: 'ex7', name: 'Squat (Barbell)', muscle: 'Legs' });
  b.routines = [{ id: 'rt1', name: 'Legs', exercises: [{ exId: 'ex7', sets: 3 }] }];
  b.history = [
    { id: 'wk1', title: 'A', date: d2, durationSec: 3600, totalVolume: 3000, totalSets: 3, exercises: [{ exId: 'ex1', sets: [{ weight: 100, reps: 5 }] }] },
    { id: 'wk2', title: 'B', date: d1, durationSec: 1800, totalVolume: 1500, totalSets: 3, exercises: [{ exId: 'ex7', sets: [{ weight: 120, reps: 5 }] }] },
  ];
  return { b, d1, d2 };
}

// P2-01 finish review: unticked placeholder sets open a modal before saving;
// existing flows confirm "Drop them" so only ticked sets are saved.
function finishWithDrop(app) {
  app.api.finishWorkout();
  if (app.api.finishReviewPending) app.api.finishReviewDrop();
}

function withBadSet(mut) {
  const b = baseBackup();
  const sets = [{ weight: 100, reps: 5 }];
  mut(sets);
  b.history = [{ id: 'wk1', title: 'W', date: 1728000000000, durationSec: 60, totalVolume: 0, totalSets: 1, exercises: [{ exId: 'ex1', sets }] }];
  return b;
}

describe('restore validation', () => {
  it('junk file rejected and nothing changes', () => {
    const app = createApp();
    const stateBefore = app.stateJson();
    const storeBefore = [...app.store.entries()];
    const r = app.api.validateBackupData({ note: 'x' });
    assert.equal(r.ok, false, 'junk rejected');
    assert.match(r.error || '', /not a PLZ Train backup/);
    assert.equal(app.stateJson(), stateBefore, 'state untouched');
    assert.deepEqual([...app.store.entries()], storeBefore, 'storage untouched');
  });

  it('bad weight, negative reps and unknown exercise rejected', () => {
    const app = createApp();
    assert.equal(app.api.validateBackupData(withBadSet((s) => { s[0].weight = 'abc'; })).ok, false, 'weight "abc" rejected');
    assert.equal(app.api.validateBackupData(withBadSet((s) => { s[0].reps = -3; })).ok, false, 'negative reps rejected');
    assert.equal(app.api.validateBackupData(withBadSet((s) => { s[0].weight = 2000; })).ok, false, 'weight > 1000 kg rejected');
    assert.equal(app.api.validateBackupData(withBadSet((s) => { s[0].reps = 1001; })).ok, false, 'reps > 1000 rejected');
    const b = baseBackup();
    b.history = [{ id: 'wk1', title: 'W', date: 1728000000000, durationSec: 60, totalVolume: 0, totalSets: 1, exercises: [{ exId: 'ex_ghost', sets: [{ weight: 100, reps: 5 }] }] }];
    const r = app.api.validateBackupData(b);
    assert.equal(r.ok, false, 'unknown exId rejected');
    assert.match(r.error || '', /Unknown exercises referenced: ex_ghost/);
  });

  it('old LBS backup migrates on a copy; input never mutated', () => {
    const app = createApp();
    const b = {
      unit: 'LBS', defaultRest: 90,
      exercises: [{ id: 'ex1', name: 'Bench Press (Barbell)', muscle: 'Chest' }],
      routines: [],
      history: [{ id: 'wk_old', title: 'Old', date: 1700000000000, durationSec: 3600, totalVolume: 999, totalSets: 1, exercises: [{ exId: 'ex1', sets: [{ weight: 220.462, reps: 5 }] }] }],
    };
    const before = JSON.stringify(b);
    const r = app.api.validateBackupData(b);
    assert.equal(r.ok, true, 'old LBS backup accepted');
    assert.ok(Math.abs(r.data.history[0].exercises[0].sets[0].weight - 100) < 0.011, '220.462 lb -> 100 kg');
    assert.equal(r.data.schemaVersion, 2);
    assert.equal(JSON.stringify(b), before, 'caller object unmutated');
  });
});

describe('restore preview', () => {
  it('valid backup gives correct counts and date range; body starts with counts', () => {
    const app = createApp();
    const { b, d1, d2 } = workoutBackup();
    const r = app.api.validateBackupData(b);
    assert.equal(r.ok, true, 'valid backup accepted');
    assert.deepEqual(
      { w: r.summary.workouts, r: r.summary.routines, e: r.summary.exercises },
      { w: 2, r: 1, e: 2 },
      'summary counts 2/1/2',
    );
    assert.equal(r.summary.firstDate, d1, 'first date correct');
    assert.equal(r.summary.lastDate, d2, 'last date correct');

    // UI fix: title stays in the modal header; the body starts with counts.
    const body = app.api.describeRestoreSummary(r.summary);
    assert.ok(!body.includes('Restore this backup?'), 'question not repeated in body');
    assert.match(body, /^2 workouts \(from .* to .*\), 1 routine, 2 exercises, unit KG/);
    app.api.showRestorePreview(r.summary);
    const shown = app.el('restorePreviewText').textContent;
    assert.ok(shown.startsWith('2 workouts'), `modal body starts with counts, got: ${shown}`);
  });
});

describe('restore + undo', () => {
  it('restore replaces data; undo returns the exact previous bytes', () => {
    const store = new Map();
    const app = createApp({ store });
    app.api.startRoutineWorkout('rt1');
    app.api.updateSetVal(0, 0, 'weight', '80');
    app.api.updateSetVal(0, 0, 'reps', '5');
    app.api.toggleSetDone(0, 0);
    finishWithDrop(app);
    const rawBefore = store.get(STATE_KEY);
    assert.ok(rawBefore, 'current state persisted before restore');

    const { b } = workoutBackup();
    const r = app.api.validateBackupData(b);
    assert.equal(r.ok, true);
    app.api.pendingRestore = r.data;
    app.api.confirmRestore();
    assert.equal(app.api.state.history.length, 2, 'backup data live after restore');
    assert.ok(store.has(BEFORE_RESTORE_KEY), 'undo snapshot kept');

    app.api.undoLastRestore();
    assert.equal(store.get(STATE_KEY), rawBefore, 'exact previous bytes back');
    assert.deepEqual(JSON.parse(store.get(STATE_KEY)), JSON.parse(rawBefore));
    assert.equal(store.has(BEFORE_RESTORE_KEY), false, 'snapshot consumed');
  });

  it('restore keeps a live draft unless the user discards it', () => {
    const store = new Map();
    const app = createApp({ store });
    app.api.startRoutineWorkout('rt1');
    assert.ok(store.has(DRAFT_KEY), 'live draft exists');
    const { b } = workoutBackup();
    app.api.pendingRestore = app.api.validateBackupData(b).data;
    app.api.confirmRestore(); // querySelector stub -> null -> default "keep"
    assert.ok(store.has(DRAFT_KEY), 'draft kept by default');
    assert.equal(app.api.state.history.length, 2, 'data still replaced');
  });
});

describe('seeding', () => {
  it('saved empty routines/exercises stay empty (no reseed)', () => {
    const store = new Map();
    store.set(STATE_KEY, JSON.stringify({
      schemaVersion: 2, unit: 'KG', defaultRest: 90,
      exercises: [], routines: [], history: [],
    }));
    const app = createApp({ store });
    // NOTE: JSON comparison — arrays created inside node:vm carry a
    // different Array prototype, so strict deepEqual would fail vacuously.
    assert.equal(JSON.stringify(app.api.state.routines), '[]', 'routines [] stays empty');
    assert.equal(JSON.stringify(app.api.state.exercises), '[]', 'exercises [] stays empty');
  });

  it('true first run seeds defaults', () => {
    const app = createApp(); // no saved state at all
    assert.ok(app.api.state.exercises.length === app.api.DEFAULT_EXERCISES.length && app.api.DEFAULT_EXERCISES.length > 0, 'exercises seeded');
    assert.ok(app.api.state.routines.length === app.api.DEFAULT_ROUTINES.length && app.api.DEFAULT_ROUTINES.length > 0, 'routines seeded');
  });
});
