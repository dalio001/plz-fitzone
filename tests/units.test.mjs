// tests/units.test.mjs — canonical-kg behavior on the REAL app code.
// 3. Units: 100 kg shows 220.5 lb; typing 225 lb stores 102.06 kg;
//    10 toggles leave stored values identical; volume and best set in kg.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml, finishWithDrop } from './harness.mjs';

describe('units (canonical kg)', () => {
  it('100 kg shows as 220.5 lb', () => {
    const app = createApp();
    assert.equal(app.api.toDisplayWeight(100, 'LBS'), 220.5);
  });

  it('typing 225 lb stores 102.06 kg', () => {
    const app = createApp();
    assert.equal(app.api.fromInputWeight(225, 'LBS'), 102.06);
  });

  it('10 unit toggles leave stored values identical', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    app.api.updateSetVal(0, 0, 'weight', '100');
    app.api.updateSetVal(0, 0, 'reps', '5');
    app.api.toggleSetDone(0, 0);
    finishWithDrop(app);
    const before = JSON.stringify(app.api.state.history);

    for (let i = 0; i < 10; i++) app.api.toggleUnit();
    assert.equal(JSON.stringify(app.api.state.history), before, 'stored kg untouched by display toggles');
    assert.equal(app.api.state.unit, 'KG', 'even toggle count returns to KG');
  });

  it('volume and best set are computed in kg, not display lb', () => {
    const app = createApp();
    app.api.toggleUnit(); // display LBS; storage must stay kg
    assert.equal(app.api.state.unit, 'LBS');
    app.api.startRoutineWorkout('rt1');
    const exId = app.api.activeWorkout.exercises[0].exId;
    app.api.updateSetVal(0, 0, 'weight', '100'); // 100 lb typed -> 45.36 kg
    app.api.updateSetVal(0, 0, 'reps', '10');
    app.api.toggleSetDone(0, 0);
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, 45.36, 'stored in kg');
    finishWithDrop(app);

    const vol = app.api.state.history[0].totalVolume;
    assert.ok(Math.abs(vol - 453.6) < 0.05, `volume in kg (~453.6), got ${vol}`);
    assert.ok(vol < 500, 'volume is not the lb value (1000)');
    const best = app.api.getBest1RM(exId);
    assert.ok(Math.abs(best - 60.48) < 0.05, `Epley best in kg (~60.48), got ${best}`);
    assert.equal(app.api.toDisplayWeight(best, 'LBS'), Math.round(best * 2.20462 * 10) / 10);
  });

  it('display never relabels raw values (old relabel bug stays gone)', () => {
    const html = loadIndexHtml();
    assert.ok(!html.includes('${bestSet.weight}${state.unit}'), 'no raw bestSet.weight relabel');
    assert.ok(!html.includes('${prev.weight}${state.unit'), 'no raw prev.weight relabel');
    for (const fn of ['function toDisplayWeight(', 'function fromInputWeight(']) {
      assert.ok(html.includes(fn), `index.html contains ${fn}`);
    }
  });
});
