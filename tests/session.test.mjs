// tests/session.test.mjs — live-workout durability on the REAL app code.
// 1. Live workout survives reload (sets + rest end time).
// 2. Finish twice creates exactly one history entry; draft cleared after
//    finish and after discard.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, DRAFT_KEY, STATE_KEY, finishWithDrop } from './harness.mjs';

function startAndTickTwo(app) {
  app.api.startRoutineWorkout('rt1');
  app.api.updateSetVal(0, 0, 'weight', '100');
  app.api.updateSetVal(0, 0, 'reps', '5');
  app.api.toggleSetDone(0, 0);
  app.api.updateSetVal(0, 1, 'weight', '100');
  app.api.updateSetVal(0, 1, 'reps', '5');
  app.api.toggleSetDone(0, 1);
}

describe('live workout survives reload', () => {
  it('resume draft keeps both ticked sets and the rest end time', () => {
    const store = new Map();
    const app = createApp({ store });
    startAndTickTwo(app);

    // Fresh JS context on the SAME storage = reload without a browser.
    const app2 = createApp({ store });
    const draft = app2.api.loadActiveSessionDraft();
    assert.ok(draft, 'draft exists after reload');
    const done = draft.exercises[0].sets.filter((s) => s.done);
    assert.equal(done.length, 2, 'both ticked sets survive reload');
    assert.equal(done[0].weight, 100, 'set 1 weight survives');
    assert.equal(done[0].reps, 5, 'set 1 reps survive');
    assert.equal(typeof draft.restDeadline, 'number', 'rest end time is stored');
    assert.ok(draft.restDeadline > Date.now(), 'rest end time is still in the future');

    // And the user can actually resume it into a live workout.
    app2.api.resumeSavedWorkout();
    assert.ok(app2.api.activeWorkout, 'workout resumed');
    const live = app2.api.activeWorkout.exercises[0].sets.filter((s) => s.done);
    assert.equal(live.length, 2, 'resumed workout has both ticked sets');
  });
});

describe('finish and discard', () => {
  it('finish twice creates exactly one history entry and clears the draft', () => {
    const store = new Map();
    const app = createApp({ store });
    startAndTickTwo(app);
    assert.ok(store.has(DRAFT_KEY), 'draft exists before finish');

    finishWithDrop(app);
    app.api.finishWorkout(); // double-tap / double-submit guard

    assert.equal(app.api.state.history.length, 1, 'exactly one history entry');
    assert.equal(store.has(DRAFT_KEY), false, 'draft cleared after finish');
    assert.equal(app.api.activeWorkout, null, 'no live workout after finish');
    assert.ok(store.has(STATE_KEY), 'state persisted');
  });

  it('discard clears the draft and adds no history', () => {
    const store = new Map();
    const app = createApp({ store });
    startAndTickTwo(app);
    const before = app.api.state.history.length;

    app.api.discardWorkout(); // confirm stub returns true
    assert.equal(app.confirms.length, 1, 'discard asked once');
    assert.equal(store.has(DRAFT_KEY), false, 'draft cleared after discard');
    assert.equal(app.api.activeWorkout, null, 'no live workout after discard');
    assert.equal(app.api.state.history.length, before, 'no history entry added');
  });
});
