// tests/qa_phone_fixes.test.mjs — fixes from the phone test sweep (2026-11-05).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml } from './harness.mjs';

describe('phone test sweep fixes', () => {
  it('typing a too-big weight never falls back to the shorter value it passed through', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex2');
    ['2', '20', '200', '2000'].forEach((v) => app.api.updateSetVal(0, 0, 'weight', v));
    app.api.updateSetVal(0, 0, 'reps', '8');
    const s = app.api.activeWorkout.exercises[0].sets[0];
    assert.equal(s.weight, '', '2000 kg is not kept as 200');
    assert.equal(app.api.toggleSetDone(0, 0), false, 'cannot be ticked');
    assert.ok(!/Enter weight/.test(app.api.setInputErrors['0:0'].weight), 'keeps the real reason: ' + app.api.setInputErrors['0:0'].weight);
    app.api.updateSetVal(0, 0, 'reps', '5000');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].reps, '');
  });

  it('a timed exercise asks for a comfortable time, not a weight', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex60');
    const html = app.api.targetLineHtml(0);
    assert.ok(html.includes('comfortable time'));
    assert.ok(!html.includes('comfortable weight'));
  });

  it('profile tabs wrap at big text sizes instead of being cut off', () => {
    assert.ok(/\.profile-section-control \{[^}]*flex-wrap: wrap/.test(loadIndexHtml()));
  });
});
