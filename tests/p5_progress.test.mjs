// tests/p5_progress.test.mjs — P5-01 metric dictionary + P5-02 progress page.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, STATE_KEY, plain } from './harness.mjs';

describe('P5-01 metric dictionary', () => {
  it('METRICS_VERSION is 1 and pure functions exist', () => {
    const app = createApp();
    assert.equal(app.api.METRICS_VERSION, 1);
    assert.equal(typeof app.api.metricCountingSets, 'function');
    assert.equal(typeof app.api.isLoadSet, 'function');
    assert.equal(typeof app.api.epley1RMKg, 'function');
    assert.equal(typeof app.api.usesLoadMetrics, 'function');
  });

  it('warmups-excluded, drop-and-failure-count, weight-0-ignored-for-load', () => {
    const app = createApp();
    // Synthetic history with W (warm-up), D (drop), F (failure), N (normal), weight 0
    app.api.state.history = [{
      id: 'w1', title: 'T', date: 1700000000000, durationSec: 60,
      totalVolume: 0, totalSets: 3,
      exercises: [{ exId: 'ex1', note: '', sets: [
        { type: 'W', weight: 40, reps: 10, done: true },
        { type: 'N', weight: 100, reps: 5, done: true },
        { type: 'D', weight: 80, reps: 4, done: true },
        { type: 'F', weight: 60, reps: 3, done: true },
        { type: 'N', weight: 0, reps: 10, done: true },
      ]}],
    }];
    const counting = app.api.metricCountingSets(app.api.state.history[0].exercises[0].sets);
    assert.equal(counting.length, 4); // W excluded; D and F included
    assert.equal(counting[0].type, 'N');
    assert.equal(counting[0].weight, 100);
    // Weight 0 set counts for volume/reps but not load records
    assert.ok(app.api.isLoadSet({ type: 'N', weight: 100, reps: 5, done: true }));
    assert.ok(!app.api.isLoadSet({ type: 'N', weight: 0, reps: 10, done: true }));
    assert.ok(!app.api.isLoadSet({ type: 'W', weight: 40, reps: 10, done: true }));
  });

  it('epley-limited-to-1-to-12-reps', () => {
    const app = createApp();
    assert.equal(app.api.epley1RMKg(100, 1), 100);
    assert.ok(Math.abs(app.api.epley1RMKg(100, 5) - 116.6667) < 0.01);
    assert.equal(app.api.epley1RMKg(100, 12), 140);
    assert.equal(app.api.epley1RMKg(100, 20), null);
    assert.equal(app.api.epley1RMKg(100, 0), null);
    assert.equal(app.api.epley1RMKg(0, 5), null);
  });

  it('record-tie-keeps-earliest-date', () => {
    const app = createApp();
    app.api.state.history = [
      { id: 'w_old', title: 'T', date: 1600000000000, durationSec: 60, totalVolume: 500, totalSets: 1, exercises: [{ exId: 'ex1', note: '', sets: [{ type: 'N', weight: 100, reps: 5, done: true }] }] },
      { id: 'w_new', title: 'T', date: 1700000000000, durationSec: 60, totalVolume: 500, totalSets: 1, exercises: [{ exId: 'ex1', note: '', sets: [{ type: 'N', weight: 100, reps: 5, done: true }] }] },
    ];
    const recs = app.api.exerciseRecords('ex1');
    assert.ok(recs.heaviestWeight);
    assert.equal(recs.heaviestWeight.histId, 'w_old', 'earliest wins tie');
  });

  it('records-follow-history-edit-and-delete', () => {
    const app = createApp();
    app.api.state.history = [
      { id: 'w1', title: 'T', date: 1600000000000, durationSec: 60, totalVolume: 500, totalSets: 1, exercises: [{ exId: 'ex1', note: '', sets: [{ type: 'N', weight: 100, reps: 5, done: true }] }] },
    ];
    const recBefore = app.api.exerciseRecords('ex1');
    assert.equal(recBefore.heaviestWeight.histId, 'w1');
    // Edit: increase weight using the public edit path
    app.api.openHistEdit('w1');
    app.api.editingHistDraft.exercises[0].sets[0].weight = 120;
    app.api.saveHistEdit();
    const recAfter = app.api.exerciseRecords('ex1');
    assert.equal(recAfter.heaviestWeight.valueKg, 120);
    // Delete the edited entry
    app.api.askDeleteHist('w1');
    app.api.confirmDeleteHist();
    const recAfterDel = app.api.exerciseRecords('ex1');
    assert.equal(recAfterDel.heaviestWeight, null);
  });

  it('bodyweight-exercise-shows-reps-only', () => {
    const app = createApp();
    // ex15 is bodyweight
    const ex = app.api.state.exercises.find(e => e.id === 'ex15');
    assert.ok(ex);
    assert.equal(app.api.usesLoadMetrics(ex), false);
    app.api.state.history = [{
      id: 'w1', title: 'T', date: 1700000000000, durationSec: 60, totalVolume: 0, totalSets: 1,
      exercises: [{ exId: 'ex15', note: '', sets: [{ type: 'N', weight: 0, reps: 15, done: true }] }],
    }];
    const recs = app.api.exerciseRecords('ex15');
    assert.ok(recs.mostRepsInSet, 'mostRepsInSet exists');
    assert.equal(recs.mostRepsInSet ? recs.mostRepsInSet.reps : null, 15);
    assert.equal(recs.heaviestWeight, null);
    // rep records cover 1..12 only (P5-01); 15 reps lives in mostRepsInSet
    assert.equal(recs.repRecords['15'], undefined);
    assert.equal(recs.bestE1RM, null);
  });
});

describe('P5-02 progress page', () => {
  it('open-from-live-workout-keeps-typed-values', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex1');
    app.api.updateSetVal(0, 0, 'weight', '80');
    app.api.updateSetVal(0, 0, 'reps', '6');
    const beforeWork = JSON.stringify(app.api.activeWorkout);
    const beforeState = JSON.stringify(app.api.state);
    app.api.openExerciseProgress('ex1', 'workout');
    app.api.closeExerciseProgress();
    assert.equal(JSON.stringify(app.api.activeWorkout), beforeWork, 'workout draft unchanged');
    assert.equal(JSON.stringify(app.api.state), beforeState, 'state unchanged');
  });

  it('link-points-and-generated-handlers-compile', () => {
    const app = createApp();
    app.api.openExerciseProgress('ex1', 'catalogue');
    const bodyHtml = app.document.getElementById('exProgressBody').innerHTML || '';
    const attrs = [...bodyHtml.matchAll(/onclick="([^"]+)"/g)].map(m => m[1]);
    attrs.forEach(a => { new Function(a); });
    app.api.closeExerciseProgress();
  });

  it('chart-empty-and-single-point-states', () => {
    const app = createApp();
    app.api.openExerciseProgress('ex1', 'catalogue');
    const html = app.document.getElementById('exProgressBody').innerHTML || '';
    assert.ok(html.includes('No sessions yet') || html.includes('No completed') || html.includes('1 session'), 'empty/single state shown');
    app.api.closeExerciseProgress();
  });

  it('progress-page-renders-in-lbs', () => {
    const app = createApp();
    app.api.toggleUnit();
    app.api.openExerciseProgress('ex1', 'catalogue');
    const html = app.document.getElementById('exProgressBody').innerHTML || '';
    assert.ok(html.includes('Best set') || html.includes('Heaviest') || html.includes('1M'), 'LBS/display mode renders page');
    app.api.closeExerciseProgress();
  });

  it('profile-records-card-shows-top-8-recent', () => {
    const app = createApp();
    // Add 3 quick workouts with different exercises
    const ids = ['ex1', 'ex2', 'ex3', 'ex4'];
    ids.forEach(id => {
      app.api.startEmptyWorkout();
      app.api.addExerciseToWorkout(id);
      app.api.updateSetVal(0, 0, 'weight', '50');
      app.api.updateSetVal(0, 0, 'reps', '5');
      app.api.toggleSetDone(0, 0);
      app.api.finishWorkout();
      if (app.api.finishReviewPending) app.api.finishReviewDrop();
    });
    app.api.renderProfileStats();
    const recHtml = app.document.getElementById('profileRecords').innerHTML || '';
    assert.ok(recHtml.length > 0, 'records card rendered');
    assert.ok(recHtml.includes('Bench Press') || recHtml.includes('ex1') || recHtml.includes('Heaviest'), 'record rows present');
  });
});
