// tests/p6_01_rest_default.test.mjs — P6-01: the Profile default rest is
// validated (whole seconds 0..600) and 0 means Off (no rest timer).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, STATE_KEY } from './harness.mjs';

function tickFirstSet(app) {
  app.api.startEmptyWorkout();
  app.api.addExerciseToWorkout('ex1');
  app.api.updateSetVal(0, 0, 'weight', '60');
  app.api.updateSetVal(0, 0, 'reps', '8');
  assert.equal(app.api.toggleSetDone(0, 0), true);
}

describe('P6-01 default rest: Off and bounds', () => {
  it('only whole seconds 0..600 are kept; anything else falls back to 90', () => {
    const app = createApp();
    const n = app.api.normalizeDefaultRest;
    assert.equal(n(0), 0);
    assert.equal(n('0'), 0);
    assert.equal(n(600), 600);
    assert.equal(n('120'), 120);
    for (const bad of ['', null, undefined, -5, 601, 99999, 12.5, 'abc', NaN]) assert.equal(n(bad), 90, String(bad));
  });

  it('typing 0 keeps 0 (Off) and survives a reload; was turned back into 90', () => {
    const store = new Map();
    const app = createApp({ store });
    app.el('defaultRestInput').value = '0';
    app.api.saveRestPreference();
    assert.equal(app.api.state.defaultRest, 0);
    const app2 = createApp({ store });
    assert.equal(app2.api.state.defaultRest, 0);
  });

  it('a refused entry shows the kept value in the box', () => {
    const app = createApp();
    app.el('defaultRestInput').value = '-30';
    app.api.saveRestPreference();
    assert.equal(app.api.state.defaultRest, 90);
    assert.equal(String(app.el('defaultRestInput').value), '90');
  });

  it('with the default Off, ticking a set starts no rest timer', () => {
    const app = createApp();
    app.api.state.defaultRest = 0;
    tickFirstSet(app);
    assert.equal(app.api.restDeadline, null);
  });

  it('with a default of 120, ticking a set starts a 2-minute timer', () => {
    const app = createApp();
    app.api.state.defaultRest = 120;
    const before = Date.now();
    tickFirstSet(app);
    assert.ok(app.api.restDeadline >= before + 119000 && app.api.restDeadline <= Date.now() + 121000);
  });

  it('a broken saved value is fixed on load', () => {
    const store = new Map();
    const seed = createApp({ store });
    seed.api.state.defaultRest = -40;
    seed.api.saveState();
    const app = createApp({ store });
    assert.equal(app.api.state.defaultRest, 90);
    assert.equal(JSON.parse(store.get(STATE_KEY)).defaultRest, 90);
  });
});
