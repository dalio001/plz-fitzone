// tests/p2_18_cali_gear.test.mjs — P2-18 step 2: equipment. Owner, 2026-11-06:
// "every person get to check what equipment he have, and according to those
// equipment he get the training he needs that correspond to his level".
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

const app = createApp();
const { CALI_LADDERS, CALI_GEAR, CALI_GEAR_INFO, CALI_PLACES, CALI_HOWTO, EXERCISE_HOWTO, DEFAULT_EXERCISES,
  normalizeCali, caliHas, caliPickStep } = app.api;
const byId = {};
DEFAULT_EXERCISES.forEach((e) => { byId[e.id] = e; });
const plain = (x) => JSON.parse(JSON.stringify(x));

describe('P2-18 calisthenics equipment', () => {
  it('every gear item has a label and help; places only tick known gear', () => {
    for (const g of CALI_GEAR) assert.equal(CALI_GEAR_INFO[g].length, 3, g);
    for (const p of Object.keys(CALI_PLACES)) {
      for (const g of CALI_PLACES[p][1]) assert.ok(CALI_GEAR.includes(g), p + ' ' + g);
    }
  });

  it('floor is always owned, unknown gear is dropped', () => {
    assert.deepEqual(plain(normalizeCali({ gear: ['bar', 'spaceship'] }).gear), ['floor', 'bar']);
    assert.deepEqual(plain(normalizeCali(null).gear), ['floor']);
    assert.equal(normalizeCali({ place: 'moon' }).place, '');
  });

  it('a box, a bench and two chairs stand in for each other', () => {
    assert.ok(caliHas(['floor', 'chairs'], ['bench']));
    assert.ok(caliHas(['floor', 'bench'], ['box']));
    assert.ok(!caliHas(['floor'], ['box']));
  });

  it('with all the gear every step is trained as itself', () => {
    for (const l of CALI_LADDERS) for (const st of l.steps) {
      const p = caliPickStep(st, CALI_GEAR.slice());
      assert.equal(p.ex, st.ex);
      assert.equal(p.alt, false);
    }
  });

  it('every alternative is a real exercise of the same kind, with a how-to and other gear', () => {
    const used = new Set(CALI_LADDERS.flatMap((l) => l.steps.map((s) => s.ex)));
    for (const l of CALI_LADDERS) for (const st of l.steps) {
      for (const a of st.alts || []) {
        const ex = byId[a.ex];
        assert.ok(ex, a.ex + ' in catalogue');
        assert.equal(ex.type === 'duration', st.hold, a.ex + ' same hold/reps kind as ' + st.ex);
        assert.ok(a.gear.every((g) => CALI_GEAR.includes(g)), a.ex + ' gear');
        assert.notDeepEqual(plain(a.gear), plain(st.gear), a.ex + ' needs other gear');
        assert.ok(CALI_HOWTO[a.ex] || EXERCISE_HOWTO[a.ex], a.ex + ' how-to');
        assert.ok(!used.has(a.ex) || a.ex.startsWith('ex'), a.ex + ' is not itself a ladder step');
      }
    }
  });

  it('band, weighted and same-exercise gear point at real exercises with a how-to', () => {
    for (const l of CALI_LADDERS) for (const st of l.steps) {
      for (const g of st.also || []) assert.ok(CALI_GEAR.includes(g), st.ex + ' also ' + g);
      for (const x of [st.band, st.weighted].filter(Boolean)) {
        assert.ok(byId[x.ex], x.ex + ' in catalogue');
        assert.ok(CALI_HOWTO[x.ex], x.ex + ' how-to');
      }
      if (st.weighted) assert.ok(st.weighted.after >= 10, st.ex + ' weighted only after enough clean reps');
    }
  });

  it('floor only starts push, legs and core; a home setup starts every strength ladder but the pull-up', () => {
    const start = (id, have) => CALI_LADDERS.find((x) => x.id === id).steps.some((st) => caliPickStep(st, have));
    for (const id of ['push', 'legs', 'core']) assert.ok(start(id, ['floor']), id);
    const home = CALI_PLACES.home[1].slice();
    for (const id of ['push', 'dip', 'row', 'legs', 'core', 'hang', 'lsit']) assert.ok(start(id, home), 'home ' + id);
    assert.ok(!start('pull', home), 'no bar at home: pull-up stays closed (rows instead)');
  });

  it('no bar but rings: the pull-up ladder runs on rings', () => {
    const p = caliPickStep(CALI_LADDERS.find((x) => x.id === 'pull').steps[3], ['floor', 'rings']);
    assert.equal(p.ex, 'ex25');
  });
});
