// tests/p2_18_cali_level_test.test.mjs — P2-18 step 3: the level test places
// you on every ladder (owner, 2026-11-06: "the training he needs that
// correspond to his level").
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

const app = createApp();
const { CALI_LADDERS, CALI_TEST, CALI_TEST_SKILLS, caliPlaceFromTest, caliOverallLevel, normalizeCali } = app.api;
const lad = (id) => CALI_LADDERS.find((l) => l.id === id);
const exAt = (pos, id) => lad(id).steps[pos[id]].ex;

describe('P2-18 level test', () => {
  it('no answers: every ladder starts at step 1, level Foundation', () => {
    const pos = caliPlaceFromTest({});
    for (const l of CALI_LADDERS) assert.equal(pos[l.id], 0, l.id);
    assert.equal(caliOverallLevel(pos), 0);
  });

  it('a true beginner starts on the easiest versions', () => {
    const pos = caliPlaceFromTest({ push: 0, pull: 0, dip: 0, legs: 0, core: 5, hang: 0, skills: [] });
    assert.equal(exAt(pos, 'push'), 'ex24');
    assert.equal(exAt(pos, 'pull'), 'cx_scap_pullup');
    assert.equal(exAt(pos, 'dip'), 'cx_support_hold');
    assert.equal(exAt(pos, 'legs'), 'cx_box_squat');
    assert.equal(exAt(pos, 'core'), 'ex60');
  });

  it('counts move you up the ladder: 1-4 pull-ups = negatives, 5+ = pull-ups', () => {
    assert.equal(exAt(caliPlaceFromTest({ pull: 3 }), 'pull'), 'cx_negative_pullup');
    assert.equal(exAt(caliPlaceFromTest({ pull: 8 }), 'pull'), 'ex25');
    assert.equal(exAt(caliPlaceFromTest({ pull: 20 }), 'pull'), 'cx_archer_pullup');
    assert.equal(exAt(caliPlaceFromTest({ push: 15 }), 'push'), 'ex99');
    assert.equal(exAt(caliPlaceFromTest({ dip: 10 }), 'dip'), 'ex55');
    assert.equal(exAt(caliPlaceFromTest({ legs: 4 }), 'legs'), 'cx_shrimp_squat');
    assert.equal(exAt(caliPlaceFromTest({ legs: 3 }), 'legs'), 'cx_pistol_squat');
    assert.equal(exAt(caliPlaceFromTest({ dip: 0 }), 'dip'), 'cx_support_hold');
  });

  it('ticked skills lift only their own ladder, never down', () => {
    const lsit = CALI_TEST_SKILLS.findIndex((s) => s[1] === 'lsit' && s[2] === 'cx_lsit');
    const tuck = CALI_TEST_SKILLS.findIndex((s) => s[1] === 'lsit' && s[2] === 'cx_one_leg_lsit');
    const pos = caliPlaceFromTest({ skills: [lsit, tuck] });
    assert.equal(exAt(pos, 'lsit'), 'cx_lsit');
    assert.equal(pos.planche, 0);
  });

  it('every skill tick points at a real step; every question is well formed', () => {
    for (const s of CALI_TEST_SKILLS) assert.ok(lad(s[1]) && lad(s[1]).steps.some((st) => st.ex === s[2]), s[0]);
    for (const q of CALI_TEST) {
      assert.ok(['num', 'pick', 'skills'].includes(q.kind), q.id);
      if (q.kind === 'pick') assert.ok(q.opts.length >= 2, q.id);
      if (q.ex) assert.ok(app.api.DEFAULT_EXERCISES.some((e) => e.id === q.ex), q.ex);
    }
  });

  it('a strong athlete lands in Intermediate or higher', () => {
    const pos = caliPlaceFromTest({ push: 40, pull: 20, dip: 25, legs: 4, core: 70, hang: 3, skills: [] });
    assert.ok(caliOverallLevel(pos) >= 2);
    for (const l of CALI_LADDERS) assert.ok(pos[l.id] < l.steps.length, l.id);
  });

  it('saved positions are cleaned: unknown ladders dropped, out-of-range clamped', () => {
    const c = normalizeCali({ pos: { push: 99, moon: 3, pull: -1, dip: 'x', row: 2 } });
    assert.equal(c.pos.push, lad('push').steps.length - 1);
    assert.equal(c.pos.row, 2);
    assert.ok(!('moon' in c.pos) && !('pull' in c.pos) && !('dip' in c.pos));
    assert.equal(normalizeCali({ tested: 'yes' }).tested, undefined);
  });

  it('the test runs end to end and saves your level', () => {
    const a = createApp();
    const api = a.api;
    api.state.cali = { gear: ['floor', 'bar'], gearSet: true };
    api.openCaliTest();
    api.caliTestSetNum(12); api.caliTestNext();   // push
    api.caliTestSetNum(6); api.caliTestNext();    // pull (bar owned; dips skipped)
    api.caliTestPick(1);                          // legs
    api.caliTestSetNum(25); api.caliTestNext();   // core
    api.caliTestPick(1);                          // hang
    api.caliTestNext();                           // skills: none
    api.saveCaliTest();
    const c = api.state.cali;
    assert.equal(c.pos.push, 2);
    assert.equal(c.pos.pull, 3);
    assert.equal(c.pos.dip, 0);
    assert.ok(typeof c.tested.date === 'string' && c.tested.level >= 0);
  });
});
