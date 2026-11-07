// tests/p2_18_cali_progression.test.mjs — P2-18 step 4: the progression
// engine reads saved workouts: two clean sessions at the top of the range on
// different days = ready for the next step (one tap, never automatic).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

const DAY = 86400000;
const NOW = Date.now();
const ago = (d) => NOW - d * DAY;
const reps = (...r) => r.map((n) => ({ type: 'N', reps: n, weight: '', done: true }));
const holds = (...r) => r.map((n) => ({ type: 'N', durationSec: n, done: true }));
const wk = (date, exId, sets) => ({ id: 'wk_' + date + exId, date, exercises: [{ exId, sets }] });

function setup(pos, history, extra) {
  const app = createApp();
  const api = app.api;
  const since = {};
  const d = new Date(ago(30));
  const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  Object.keys(pos).forEach((k) => { since[k] = key; });
  api.state.cali = Object.assign({ gear: ['floor', 'bar', 'lowbar', 'dipbars', 'box', 'wall'], gearSet: true, pos, since,
    tested: { date: '2026-10-01', level: 1 } }, extra || {});
  api.state.history = history;
  return api;
}

describe('P2-18 progression engine', () => {
  it('a pass = the step\'s number of normal sets at the top of the range', () => {
    const api = createApp().api;
    const st = api.CALI_LADDERS.find((l) => l.id === 'push').steps[2]; // Push-Up 3 × 10-15
    assert.equal(api.caliJudge(st, reps(15, 15, 15)), 'pass');
    assert.equal(api.caliJudge(st, reps(15, 15, 12)), 'ok');
    assert.equal(api.caliJudge(st, reps(8, 6)), 'short');
    assert.equal(api.caliJudge(st, [{ type: 'W', reps: 20, done: true }]), null, 'warm-up sets do not count');
    const hold = api.CALI_LADDERS.find((l) => l.id === 'core').steps[0]; // Plank 3 × 30-60 s
    assert.equal(api.caliJudge(hold, holds(60, 61, 60)), 'pass');
  });

  it('two passes on different days = ready; same day twice = still 1 of 2', () => {
    let api = setup({ push: 2 }, [wk(ago(3), 'ex17', reps(15, 15, 15)), wk(ago(3) + 1000, 'ex17', reps(15, 15, 15))]);
    let s = api.caliLadderStatus('push');
    assert.equal(s.passes, 1);
    assert.equal(s.ready, false);
    api = setup({ push: 2 }, [wk(ago(3), 'ex17', reps(15, 15, 15)), wk(ago(1), 'ex17', reps(16, 15, 15))]);
    s = api.caliLadderStatus('push');
    assert.equal(s.ready, true);
    assert.deepEqual(JSON.parse(JSON.stringify(api.caliReadyList())), ['push']);
  });

  it('it never moves you by itself; Move up does, and passes start over', () => {
    const api = setup({ push: 2 }, [wk(ago(3), 'ex17', reps(15, 15, 15)), wk(ago(1), 'ex17', reps(15, 15, 15))]);
    assert.equal(api.state.cali.pos.push, 2);
    api.caliMoveStep('push', 1);
    assert.equal(api.state.cali.pos.push, 3);
    const s = api.caliLadderStatus('push');
    assert.equal(s.passes, 0);
    assert.equal(s.firstWeek, true);
  });

  it('sessions before you reached the step do not count', () => {
    const api = setup({ push: 2 }, [wk(ago(40), 'ex17', reps(15, 15, 15)), wk(ago(35), 'ex17', reps(15, 15, 15))]);
    assert.equal(api.caliLadderStatus('push').passes, 0);
  });

  it('three short sessions in a row suggest a step back', () => {
    const api = setup({ pull: 3 }, [wk(ago(5), 'ex25', reps(3, 2)), wk(ago(3), 'ex25', reps(4, 3)), wk(ago(1), 'ex25', reps(2, 2))]);
    const s = api.caliLadderStatus('pull');
    assert.equal(s.stepBack, true);
    assert.equal(api.state.cali.pos.pull, 3, 'only a suggestion');
  });

  it('your gear\'s alternative counts as the step', () => {
    const api = createApp().api;
    const l = api.CALI_LADDERS.find((x) => x.steps.some((st) => st.alts && st.alts.length));
    const i = l.steps.findIndex((st) => st.alts && st.alts.length);
    const st = l.steps[i];
    const sets = Array.from({ length: st.sets }, () => (st.hold ? { type: 'N', durationSec: st.hi, done: true } : { type: 'N', reps: st.hi, done: true }));
    const a2 = setup({ [l.id]: i }, [wk(ago(4), st.alts[0].ex, sets), wk(ago(2), st.alts[0].ex, sets)]);
    assert.equal(a2.caliLadderStatus(l.id).passes, 2);
  });

  it('a lock on the next step is open once you logged its count', () => {
    const api = setup({ pull: 1, row: 0 }, [wk(ago(2), 'ex33', reps(15))]);
    assert.equal(api.caliNeedMet(['row', 'ex33', 15]), true);
    const api2 = setup({ pull: 1, row: 0 }, [wk(ago(2), 'ex33', reps(10))]);
    assert.equal(api2.caliNeedMet(['row', 'ex33', 15]), false);
    const api3 = setup({ pull: 1, row: 3 }, []);
    assert.equal(api3.caliNeedMet(['row', 'ex33', 15]), true, 'already past it on the ladder');
  });

  it('every 6th week from the first test is a light week', () => {
    const k = (d) => new Date(NOW - d * DAY).toISOString().slice(0, 10);
    assert.equal(setup({}, [], { start: k(36) }).caliDeloadWeek(), true);
    assert.equal(setup({}, [], { start: k(10) }).caliDeloadWeek(), false);
  });

  it('Train this puts your step into a workout with its sets and range', () => {
    const api = setup({ push: 2 }, []);
    api.caliTrain('push');
    const w = api.activeWorkout;
    assert.ok(w);
    const ex = w.exercises[w.exercises.length - 1];
    assert.equal(ex.exId, 'ex17');
    assert.equal(ex.sets.length, 3);
    assert.equal(ex.targetRepsLabel, '10-15');
  });
});
