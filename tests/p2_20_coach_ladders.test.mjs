// tests/p2_20_coach_ladders.test.mjs — P2-20 coach review of the ladders.
// Owner, 2026-11-09: "the progression a little bit not accurate... act as a
// calisthenics coach... more specific, more accurate, more personalized".
// Order and locks follow Heria first, cross-checked with Overcoming Gravity
// and the r/bodyweightfitness routine (docs/research/CALISTHENICS_COACH_REVIEW.md).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

const GEAR = ['floor', 'wall', 'box', 'bench', 'bar', 'lowbar', 'dipbars', 'parallettes', 'rings', 'pole', 'anchor'];
const order = (api, id) => api.caliLadder(id).steps.map((s) => s.ex);
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const before = (list, a, b) => list.indexOf(a) >= 0 && list.indexOf(a) < list.indexOf(b);

describe('P2-20 ladder order (coach review)', () => {
  const api = createApp().api;

  it('back lever: inverted hang, German hang, skin the cat, tuck, advanced tuck, straddle, one-leg, full', () => {
    same(order(api, 'backlever'), ['cx_inverted_hang', 'cx_german_hang', 'cx_skin_cat', 'cx_tuck_bl', 'cx_adv_tuck_bl', 'cx_straddle_bl', 'cx_one_leg_bl', 'cx_full_bl']);
  });

  it('handstand push-up: wall negatives before the wall rep, deficit after, no balance drills as steps', () => {
    const h = order(api, 'hspu');
    assert.ok(before(h, 'cx_wall_hspu_negative', 'cx_wall_hspu'));
    assert.ok(before(h, 'cx_wall_hspu', 'cx_deficit_wall_hspu'));
    assert.ok(!h.includes('cx_wall_shoulder_taps') && !h.includes('cx_hs_press_negative'));
    const free = api.caliLadder('hspu').steps.find((s) => s.ex === 'cx_free_hspu');
    same(free.needs, [['handstand', 'cx_free_handstand', 30]]);
  });

  it('handstand: the bail comes before kicking up; freestanding needs a wall hold and wall balance', () => {
    const h = order(api, 'handstand');
    assert.ok(before(h, 'cx_hs_bail', 'cx_hs_kickup'));
    const free = api.caliLadder('handstand').steps.find((s) => s.ex === 'cx_free_handstand');
    assert.ok(free.needs.some((n) => n[1] === 'cx_wall_balance'));
  });

  it('planche: frog stand first, half-lay between straddle and full, helpers are drills', () => {
    const p = order(api, 'planche');
    assert.ok(before(p, 'cx_frog_stand', 'cx_planche_lean'));
    assert.ok(before(p, 'cx_straddle_planche', 'cx_half_lay_planche') && before(p, 'cx_half_lay_planche', 'cx_full_planche'));
    assert.ok(!p.includes('cx_reverse_leg_raise'));
    assert.ok(api.caliLadder('planche').drills.some((d) => d.ex === 'cx_reverse_leg_raise'));
  });

  it('flag: vertical flag, tuck, advanced tuck, straddle; the lock is outside the ladder so it can open', () => {
    const f = order(api, 'flag');
    assert.ok(before(f, 'cx_vertical_flag', 'cx_tuck_flag') && before(f, 'cx_tuck_flag', 'cx_adv_tuck_flag') && before(f, 'cx_adv_tuck_flag', 'cx_straddle_flag'));
    for (const l of api.CALI_LADDERS) for (const g of l.gate) assert.notEqual(g[0], l.id, l.id + ' gate points inside its own ladder');
  });

  it('muscle-up lock is realistic: 12 pull-ups, 5 chest-to-bar, 15 bar dips, 15 s hanging L-sit', () => {
    same(api.caliLadder('muscleup').gate, [['pull', 'ex25', 12], ['pull', 'cx_chest_to_bar', 5], ['dip', 'cx_straight_bar_dip', 15], ['hang', 'cx_hanging_lsit', 15]]);
    assert.ok(before(order(api, 'muscleup'), 'cx_low_bar_transition', 'cx_negative_muscleup'));
  });

  it('dip support hold before negatives; split squat before the Bulgarian; hollow rock before the V-up', () => {
    assert.ok(before(order(api, 'dip'), 'cx_support_hold', 'cx_negative_dip'));
    assert.ok(before(order(api, 'legs'), 'cx_split_squat', 'cx_bulgarian_split'));
    assert.ok(before(order(api, 'legs'), 'cx_beginner_shrimp', 'cx_pistol_squat'));
    assert.ok(before(order(api, 'core'), 'cx_hollow_rock', 'cx_v_up'));
    assert.ok(before(order(api, 'lsit'), 'cx_straddle_lsit', 'cx_vsit'));
  });

  it('drills are real exercises with a how-to, open from a real step, never also a step', () => {
    const steps = new Set();
    api.CALI_LADDERS.forEach((l) => l.steps.forEach((s) => steps.add(s.ex)));
    for (const l of api.CALI_LADDERS) for (const d of l.drills || []) {
      assert.ok(!steps.has(d.ex), d.ex + ' is not also a step');
      assert.ok(l.steps.some((s) => s.ex === d.from), d.ex + ' opens at a step');
      assert.ok(api.DEFAULT_EXERCISES.some((e) => e.id === d.ex), d.ex + ' in catalogue');
      assert.ok(api.CALI_HOWTO[d.ex], d.ex + ' how-to');
    }
  });
});

describe('P2-20 saved places move with the steps', () => {
  it('an old save keeps the same move; a move that became a drill falls back one', () => {
    const api = createApp().api;
    // Old order: handstand step 4 = chest-to-wall, push 7 = clap push-up,
    // back lever 7 = advanced tuck, hspu 4 = wall shoulder taps.
    api.state.cali = { gear: GEAR, pos: { handstand: 3, push: 6, backlever: 6, hspu: 3, planche: 4 }, log: [{ d: '2026-11-01', l: 'backlever', from: 2, to: 6 }] };
    const c = api.normalizeCali(api.state.cali);
    const at = (id) => api.caliLadder(id).steps[c.pos[id]].ex;
    assert.equal(c.lv, api.CALI_LADDER_VER);
    assert.equal(at('handstand'), 'cx_chest_wall_hs');
    assert.equal(at('push'), 'cx_archer_pushup');
    assert.equal(at('backlever'), 'cx_adv_tuck_bl');
    assert.equal(at('hspu'), 'cx_wall_hspu');
    assert.equal(at('planche'), 'cx_tuck_planche');
    assert.equal(api.caliLadder('backlever').steps[c.log[0].to].ex, 'cx_adv_tuck_bl');
    // Runs once: a second load changes nothing.
    const again = JSON.stringify(api.normalizeCali(api.state.cali).pos);
    assert.equal(again, JSON.stringify(c.pos));
  });
});

describe('P2-20 personal coaching', () => {
  const setup = () => {
    const api = createApp().api;
    api.state.cali = { lv: 2, gear: GEAR, gearSet: true, pos: { handstand: 5, hspu: 1, frontlever: 1 }, tested: { date: '2026-11-01', level: 2 } };
    api.state.profile = Object.assign({}, api.state.profile || {}, { birthDate: '', age: '' });
    return api;
  };

  it('2 clean sessions to move up; 3 with a sore joint or at 40+', () => {
    const api = setup();
    assert.equal(api.caliPassNeed(), 2);
    api.state.cali.care = ['wrists'];
    assert.equal(api.caliPassNeed(), 3);
    api.state.cali.care = [];
    api.state.profile.age = '45';
    assert.equal(api.caliPassNeed(), 3);
    assert.equal(api.caliLadderStatus('handstand').need, 3);
  });

  it('the equipment sheet sets joints; their warm-up joins every skill block', () => {
    const api = setup();
    api.openCaliGear();
    api.caliToggleCare('shoulders');
    api.caliToggleCare('nonsense');
    api.saveCaliGear();
    same(api.state.cali.care, ['shoulders']);
    const items = api.caliSkillItems('frontlever', 'gym');
    assert.ok(items.some((i) => i.exId === 'cx_shoulder_dislocate' && /warm-up/.test(i.note)));
    assert.ok(api.caliCoachNotes([{ skill: 'planche', per: 3, where: 'focus', routines: [] }]).some((n) => /2 sessions a week/.test(n)));
  });

  it('a skill day adds the drill open at your step; the gym block stays short', () => {
    const api = setup();
    // Handstand step 6 (kick-up): toe pulls and shoulder taps are open.
    const focus = api.caliSkillItems('handstand', 'focus');
    assert.ok(focus.some((i) => i.exId === 'cx_wall_shoulder_taps' && /drill/.test(i.note)));
    assert.ok(!focus.some((i) => i.exId === 'cx_hs_press_negative'), 'press opens only at the freestanding handstand');
    assert.ok(!api.caliSkillItems('handstand', 'gym').some((i) => /drill/.test(i.note)));
    assert.ok(api.caliDrills('frontlever').some((d) => d.ex === 'cx_fl_negative'));
  });

  it('a level-test tick places you by move', () => {
    const api = setup();
    const i = api.CALI_TEST_SKILLS.findIndex((s) => s[0] === '1 bar muscle-up');
    const pos = api.caliPlaceFromTest({ skills: [i] });
    assert.equal(api.caliLadder('muscleup').steps[pos.muscleup].ex, 'cx_muscleup');
  });
});
