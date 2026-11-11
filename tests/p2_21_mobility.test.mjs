// tests/p2_21_mobility.test.mjs — P2-21 mobility by body area.
// Owner, 2026-11-11: "It's missing the mobility exercises... It's like another
// sub-category with the body parts just for mobility."
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

const GEAR = ['floor', 'wall', 'box', 'bench', 'bar', 'band'];

describe('P2-21 mobility areas', () => {
  it('ten body areas, every move a real exercise with a how-to and a picture', () => {
    const app = createApp();
    const api = app.api;
    const areas = api.CALI_MOBILITY.map((a) => a.id);
    assert.deepEqual([...areas], ['neck', 'shoulders', 'wrists', 'upper_back', 'lower_back', 'hips', 'hamstrings', 'hip_flexors', 'knees', 'ankles']);
    const seen = new Set();
    for (const a of api.CALI_MOBILITY) {
      assert.ok(a.moves.length >= 4, a.id + ' has at least 4 moves');
      for (const m of a.moves) {
        assert.ok(!seen.has(m.ex), m.ex + ' only in one area');
        seen.add(m.ex);
        assert.ok(api.DEFAULT_EXERCISES.some((e) => e.id === m.ex), m.ex + ' in catalogue');
        assert.ok(api.CALI_HOWTO[m.ex] || m.ex === 'ex44', m.ex + ' how-to');
        assert.ok(api.EXERCISE_PICTURES_LIST.includes(m.ex), m.ex + ' picture');
        assert.ok(m.lo <= m.hi && m.sets >= 1, m.ex + ' target');
      }
    }
  });

  it('the Calisthenics page shows a Mobility section instead of the old Support card', () => {
    const app = createApp();
    app.api.state.cali = { gear: GEAR, gearSet: true, pos: {} };
    const html = app.api.caliMobilityHtml();
    assert.ok(/Mobility/.test(html) && /Full-body mobility/.test(html));
    for (const a of app.api.CALI_MOBILITY) assert.ok(html.includes('data-id="' + a.id + '"'), a.id + ' card');
  });

  it('gear filters the moves; full body takes one easy move per area', () => {
    const app = createApp();
    app.api.state.cali = { gear: ['floor'], gearSet: true, pos: {} };
    const knees = app.api.caliMobilityMoves('knees').map((m) => m.ex);
    assert.ok(!knees.includes('cx_peterson_step'), 'step-up needs a box');
    assert.ok(knees.includes('cx_heel_sit'));
    const full = app.api.caliMobilityMoves('full');
    assert.ok(full.length >= 8 && full.every((m) => m.level === 0));
  });

  it('Start puts the area into a workout with its sets and a mobility target line', () => {
    const app = createApp();
    app.api.state.cali = { gear: GEAR, gearSet: true, pos: {} };
    app.api.caliMobilityStart('hips');
    const w = app.api.activeWorkout;
    assert.ok(w && /Mobility · Hips/.test(w.title));
    assert.equal(w.exercises.length, 6);
    const pig = w.exercises.findIndex((e) => e.exId === 'cx_pigeon');
    assert.equal(w.exercises[pig].sets.length, 2);
    assert.ok(/Mobility · Hips · 2 × 30–60 s each side/.test(app.api.caliTargetLineHtml(pig)));
    assert.equal(app.api.caliFindMobility('cx_pigeon').area.id, 'hips');
  });
});

describe('P2-21 Exercises: Mobility section with a body-part filter', () => {
  it('lists only mobility moves, grouped by area, and the area chip filters them', () => {
    const app = createApp();
    const api = app.api;
    api.setExSection('mobility');
    const all = app.el('exercisesDirectory').innerHTML;
    for (const a of api.CALI_MOBILITY) assert.ok(all.includes(a.name.replace('&', '&amp;')), a.id + ' heading');
    assert.ok(!all.includes('Bench Press'), 'gym moves stay in All exercises');
    api.setExMobArea('neck');
    const neck = app.el('exercisesDirectory').innerHTML;
    assert.ok(neck.includes('Chin Tuck') && !neck.includes('Pigeon Stretch'));
    assert.equal(app.el('exMuscleChips').style.display, 'none');
    api.setExSection('all');
    assert.ok(app.el('exercisesDirectory').innerHTML.includes('Bench Press'));
  });
});
