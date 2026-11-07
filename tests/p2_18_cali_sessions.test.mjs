// tests/p2_18_cali_sessions.test.mjs — P2-18 step 5: the weekly plan is made
// of normal routines built from your steps and gear, run as the program.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

const STRAIGHT_ARM = ['frontlever', 'backlever', 'planche', 'flag'];

function setup(pos, gear, extra) {
  const api = createApp().api;
  api.state.cali = Object.assign({ gear: gear || ['floor', 'wall', 'box', 'bar', 'lowbar', 'dipbars'], gearSet: true,
    pos: pos || {}, tested: { date: '2026-11-01', level: 1 } }, extra || {});
  return api;
}

describe('P2-18 session builder', () => {
  it('the template follows your level', () => {
    const api = createApp().api;
    assert.equal(api.caliTemplateFor(0), 'full3');
    assert.equal(api.caliTemplateFor(1), 'full3');
    assert.equal(api.caliTemplateFor(2), 'ul4');
    assert.equal(api.caliTemplateFor(4), 'skill4');
  });

  it('each template: sessions match its days; a skill is never more than 3 times a week', () => {
    const api = createApp().api;
    for (const k of Object.keys(api.CALI_TEMPLATES)) {
      const t = api.CALI_TEMPLATES[k];
      assert.equal(t.sessions.length, t.days.length, k);
      for (const s of ['s1', 's2']) {
        const n = t.sessions.filter((x) => x.slots.includes(s)).length;
        assert.ok(n <= 3, k + ' ' + s + ' ' + n);
      }
      for (const x of t.sessions) {
        for (const slot of x.slots) {
          const id = slot.replace('drop:', '');
          assert.ok(['warm', 's1', 's2'].includes(id) || api.CALI_LADDERS.some((l) => l.id === id), k + ' ' + slot);
        }
      }
    }
    assert.ok(STRAIGHT_ARM.every((id) => api.CALI_LADDERS.some((l) => l.id === id)));
  });

  it('sessions use your current step, your gear\'s version, and its range', () => {
    const api = setup({ push: 4, pull: 3, legs: 4, core: 2 });
    const a = api.caliBuildSessions('full3', [])[0];
    const ids = a.items.map((i) => i.exId);
    assert.ok(ids.includes('cx_diamond_pushup'));
    assert.ok(ids.includes('ex25'));
    const push = a.items.find((i) => i.exId === 'cx_diamond_pushup');
    assert.equal(push.sets, 3);
    assert.equal(push.targetRepsMin, 8);
    assert.equal(push.targetRepsMax, 12);
    const hold = a.items.find((i) => i.exId === 'cx_hollow_hold');
    assert.equal(hold.targetDurationSec, 20);
    assert.ok(a.items.some((i) => /Finisher/.test(i.note) && i.exId === 'ex99'), 'drop-down finisher: decline push-up');
  });

  it('no bar: pull steps are left out, never a step you cannot do', () => {
    const api = setup({ pull: 3, push: 2 }, ['floor']);
    for (const s of api.caliBuildSessions('full3', [])) {
      for (const it of s.items) assert.notEqual(it.exId, 'ex25');
    }
  });

  it('locked skills are not offered; a skill you were placed into is', () => {
    const api = setup({ push: 0 }, ['floor', 'wall']);
    assert.equal(api.caliSkillOpen('handstand'), false, 'needs push-ups first');
    const api2 = setup({ push: 4, handstand: 3 }, ['floor', 'wall']);
    assert.equal(api2.caliSkillOpen('handstand'), true);
  });

  it('Build my week: routines in the Calisthenics folder, run as the program, today\'s session found', () => {
    const api = setup({ push: 4, pull: 3, legs: 4, core: 2, handstand: 4 });
    api.openCaliPlan();
    api.caliPlanTpl('full3');
    api.saveCaliPlan();
    const f = api.findFolder(api.CALI_FOLDER_ID);
    assert.ok(f && f.program);
    assert.equal(Object.keys(f.program.days).length, 3);
    const rts = api.state.routines.filter((r) => r.folderId === api.CALI_FOLDER_ID);
    assert.equal(rts.length, 3);
    const t = api.caliToday();
    assert.ok(t && t.today && t.rid === 'rt_cali_full3_1');
  });

  it('moving up a step rebuilds the routines and keeps the schedule', () => {
    const api = setup({ push: 4, pull: 3, legs: 4, core: 2 });
    api.caliApplyPlan({ tpl: 'full3', skills: [] }, true);
    const days = JSON.stringify(api.findFolder(api.CALI_FOLDER_ID).program.days);
    api.caliMoveStep('push', 1);
    const a = api.state.routines.find((r) => r.id === 'rt_cali_full3_1');
    assert.ok(a.exercises.some((i) => i.exId === 'cx_archer_pushup'));
    assert.equal(JSON.stringify(api.findFolder(api.CALI_FOLDER_ID).program.days), days);
  });

  it('switching template removes the old plan\'s routines only', () => {
    const api = setup({ push: 4, pull: 3 });
    api.state.routines.push({ id: 'rt_mine', name: 'Mine', exercises: [] });
    api.caliApplyPlan({ tpl: 'full3', skills: [] }, false);
    api.caliApplyPlan({ tpl: 'ul4', skills: [] }, false);
    const ids = api.state.routines.map((r) => r.id);
    assert.ok(ids.includes('rt_mine'));
    assert.ok(!ids.some((id) => id.startsWith('rt_cali_full3')));
    assert.equal(ids.filter((id) => id.startsWith('rt_cali_ul4')).length, 4);
  });
});
