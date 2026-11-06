// tests/p2_18_cali_ladders.test.mjs — P2-18 calisthenics mastery, step 1: the
// ladders. Owner, 2026-11-06: "every move, and how can I train for it... with
// the right progressions". Each step must be a real catalogue exercise with a
// target, gear and a how-to, and the gates must point at real steps.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

const app = createApp();
const { CALI_LADDERS, CALI_HOWTO, CALI_GEAR, CALI_LEVELS, DEFAULT_EXERCISES, EXERCISE_HOWTO } = app.api;
const byId = {};
DEFAULT_EXERCISES.forEach((e) => { byId[e.id] = e; });
const words = (t) => String(t).trim().split(/\s+/).filter(Boolean);

describe('P2-18 calisthenics ladders', () => {
  it('17 ladders: base strength, skills and mobility', () => {
    assert.equal(CALI_LADDERS.length, 17);
    const ids = CALI_LADDERS.map((l) => l.id);
    for (const id of ['push', 'pull', 'dip', 'row', 'legs', 'core', 'hang', 'lsit', 'handstand', 'hspu', 'muscleup', 'frontlever', 'backlever', 'planche', 'flag', 'dragon', 'mobility']) {
      assert.ok(ids.includes(id), 'ladder ' + id);
    }
    assert.equal(new Set(ids).size, ids.length, 'ids unique');
    assert.equal(CALI_LEVELS.length, 5);
  });

  it('every step is a built-in exercise with the right type, a target and known gear', () => {
    const seen = new Set();
    for (const l of CALI_LADDERS) {
      assert.ok(l.steps.length >= 4, l.id + ' has at least 4 steps');
      let prevLevel = 0;
      for (const st of l.steps) {
        assert.ok(!seen.has(st.ex), st.ex + ' used once');
        seen.add(st.ex);
        const ex = byId[st.ex];
        assert.ok(ex, st.ex + ' is in the catalogue');
        assert.equal(ex.type === 'duration', st.hold, st.ex + ' hold matches duration type');
        assert.equal(ex.equipment === 'Bodyweight' || st.ex.startsWith('ex'), true);
        assert.ok(st.sets >= 2 && st.lo >= 1 && st.hi >= st.lo, st.ex + ' target');
        assert.ok(st.level >= 0 && st.level <= 4, st.ex + ' level');
        assert.ok(st.level >= prevLevel, l.id + ': levels never go down along the ladder (' + st.ex + ')');
        prevLevel = st.level;
        assert.ok(st.gear.length >= 1 && st.gear.every((g) => CALI_GEAR.includes(g)), st.ex + ' gear');
      }
    }
  });

  it('every step has a how-to; new steps use short own sentences', () => {
    for (const l of CALI_LADDERS) {
      for (const st of l.steps) {
        const h = EXERCISE_HOWTO[st.ex] || CALI_HOWTO[st.ex];
        assert.ok(h && h.setup && h.move && h.avoid, st.ex + ' how-to');
        assert.ok(app.api.exerciseHowtoHtml(byId[st.ex]).includes('How to do it'), st.ex + ' how-to renders');
      }
    }
    for (const [id, h] of Object.entries(CALI_HOWTO)) {
      assert.ok(id.startsWith('cx_'), id);
      for (const f of ['setup', 'move', 'avoid']) assert.ok(words(h[f]).length <= 30, id + '.' + f + ' short');
    }
  });

  it('gates point at real steps of other ladders; hard skills are gated', () => {
    for (const l of CALI_LADDERS) {
      for (const [lid, ex] of l.gate) {
        const g = app.api.caliLadder(lid);
        assert.ok(g && g.steps.some((s) => s.ex === ex), l.id + ' gate ' + lid + '/' + ex);
      }
    }
    for (const id of ['muscleup', 'frontlever', 'backlever', 'planche', 'hspu']) {
      assert.ok(app.api.caliLadder(id).gate.length >= 1, id + ' is gated');
    }
  });

  it('a step can be found from its exercise; target text reads well', () => {
    const at = app.api.caliStepOf('ex25');
    assert.equal(at.ladder.id, 'pull');
    assert.equal(at.ladder.steps[at.index].ex, 'ex25');
    assert.equal(app.api.caliStepOf('ex1'), null, 'gym exercise is not on a ladder');
    assert.equal(app.api.caliTargetText({ sets: 3, lo: 8, hi: 12, hold: false }), '3 × 8–12');
    assert.equal(app.api.caliTargetText({ sets: 3, lo: 20, hi: 30, hold: true }), '3 × 20–30 s');
  });

  it('owners with an old exercise list get the new steps merged, names never clash', () => {
    const names = DEFAULT_EXERCISES.map((e) => e.name.toLowerCase());
    assert.equal(new Set(names).size, names.length, 'no duplicate names');
    assert.ok(app.api.state.exercises.some((e) => e.id === 'cx_muscleup'));
  });
});
