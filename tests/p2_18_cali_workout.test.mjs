// tests/p2_18_cali_workout.test.mjs — P2-18 steps 6 and 8: the workout line
// for a ladder step (aim inside the range, no gym "+1 rep"), the after-finish
// sheet, progress log, test day and the start-here guide.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

const DAY = 86400000;
const key = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const reps = (...r) => r.map((n) => ({ type: 'N', reps: n, weight: 0, done: true }));

function setup(extra) {
  const api = createApp().api;
  const since = {};
  ['push', 'pull'].forEach((k) => { since[k] = key(Date.now() - 30 * DAY); });
  api.state.cali = Object.assign({ gear: ['floor', 'bar', 'box', 'wall'], gearSet: true, pos: { push: 4, pull: 3 }, since,
    tested: { date: key(Date.now() - 10 * DAY), level: 1 }, start: key(Date.now() - 10 * DAY) }, extra || {});
  return api;
}

describe('P2-18 in the workout', () => {
  it('aim = weakest last set + 1, kept inside the range', () => {
    const api = setup();
    const st = api.CALI_LADDERS.find((l) => l.id === 'push').steps[4]; // diamond 3 × 8-12
    assert.equal(api.caliAim(st), 8, 'first time: bottom of the range');
    api.state.history = [{ id: 'w1', date: Date.now() - DAY, exercises: [{ exId: 'cx_diamond_pushup', sets: reps(10, 9, 9) }] }];
    assert.equal(api.caliAim(st), 10);
    api.state.history = [{ id: 'w1', date: Date.now() - DAY, exercises: [{ exId: 'cx_diamond_pushup', sets: reps(12, 12, 12) }] }];
    assert.equal(api.caliAim(st), 12, 'never past the top');
  });

  it('a Train exercise shows the ladder line with EMOM, not the gym +1 target', () => {
    const api = setup();
    api.caliTrain('push');
    const i = api.activeWorkout.exercises.length - 1;
    const html = api.targetLineHtml(i);
    assert.match(html, /Push-up · step 5 · aim 3 × 8/);
    assert.match(html, /EMOM/);
    assert.doesNotMatch(html, /\+1 rep/);
  });

  it('a gym workout with pull-ups keeps the gym line', () => {
    const api = setup();
    api.activeWorkout = { title: 'Back day', routineId: 'rt_gym', exercises: [{ exId: 'ex25', sets: reps(5) }] };
    assert.equal(api.caliTargetLineHtml(0), '');
    assert.equal(api.caliWorkoutEx(api.activeWorkout, { exId: 'cx_diamond_pushup' }), true);
  });

  it('EMOM timer opens and stops', () => {
    const api = setup();
    api.caliTrain('push');
    api.caliEmomStart(0);
    api.caliEmomStop();
  });

  it('progress: every move is logged, steps up counted, tests kept', () => {
    const api = setup({ tests: [{ date: '2026-10-01', level: 1, pos: { push: 2 } }] });
    api.caliMoveStep('push', 1);
    api.caliMoveStep('pull', -1);
    const c = api.state.cali;
    assert.equal(c.log.length, 2);
    assert.equal(api.caliStepsUp(), 1);
    assert.equal(c.tests.length, 1);
    api.openCaliProgress();
  });

  it('a test day is due 6 weeks after the last test', () => {
    assert.equal(setup().caliTestDue(), false);
    assert.equal(setup({ tested: { date: key(Date.now() - 43 * DAY), level: 1 } }).caliTestDue(), true);
  });

  it('the guide shows the next thing to do, and goes away when all is set up', () => {
    const api = createApp().api;
    api.state.cali = { gear: ['floor'], gearSet: false };
    assert.match(api.caliGuideHtml(api.normalizeCali(api.state.cali)), /Tick your equipment/);
    const done = setup({ plan: { tpl: 'full3', skills: [] } });
    done.state.history = [{ id: 'w', title: 'Calisthenics', date: Date.now(), exercises: [{ exId: 'cx_diamond_pushup', sets: reps(8) }] }];
    assert.equal(done.caliGuideHtml(done.normalizeCali(done.state.cali)), '');
  });

  it('a My week session finishes without the "update routine" question', () => {
    const api = setup();
    api.caliApplyPlan({ tpl: 'full3', skills: [] }, false);
    api.doStartRoutineWorkout('rt_cali_full3_1');
    api.activeWorkout.exercises.forEach((e) => e.sets.forEach((s) => { if (s.durationSec !== undefined) s.durationSec = 20; else s.reps = 8; s.weight = 0; s.done = true; }));
    api.doFinishSave();
    assert.equal(api.state.history[0].routineId, 'rt_cali_full3_1');
    assert.equal(api.pendingRoutineUpdate === undefined ? null : api.pendingRoutineUpdate, null);
  });
});
