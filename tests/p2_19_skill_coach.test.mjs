// tests/p2_19_skill_coach.test.mjs — P2-19 skill goals: you pick skills, how
// often and where (a block in a gym workout, its own day, the full-body plan);
// the coaching rules place and check them; "Ask the coach" sends what you say
// to TypeSafe Jev through /api/coach (key only on the server).
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml } from './harness.mjs';
import coachHandler, { buildCoachQuestions, readCoachAnswers } from '../api/coach.js';
import { hashToken, resetRateLimits } from '../api/_supabase.js';

const GEAR = ['floor', 'wall', 'bar', 'lowbar', 'dipbars', 'parallettes', 'band'];
const it_ = (exId) => ({ exId, sets: 3, targetRepsMin: 8, targetRepsMax: 12, restSec: 90, note: '' });

function setup(withProgram) {
  const api = createApp().api;
  const ids = (muscle) => api.DEFAULT_EXERCISES.filter((e) => e.primary === muscle && !String(e.id).startsWith('cx_')).slice(0, 3).map((e) => it_(e.id));
  api.state.routines = [
    { id: 'rt_chest', name: 'Chest', folderId: 'fd_default', exercises: ids('Chest') },
    { id: 'rt_back', name: 'Back', folderId: 'fd_default', exercises: ids('Back') },
    { id: 'rt_legs', name: 'Legs', folderId: 'fd_default', exercises: ids('Quads') },
    { id: 'rt_shoulders', name: 'Shoulders', folderId: 'fd_default', exercises: ids('Shoulders') }
  ];
  api.state.cali = { gear: GEAR, gearSet: true, pos: { push: 6, pull: 5, dip: 5, row: 3, core: 3, hang: 3, lsit: 3, handstand: 4, frontlever: 0 },
    tested: { date: '2026-11-01', level: 2 } };
  if (withProgram) {
    api.ensureFolders();
    api.saveProgramSetup('fd_default', true, { start: '2026-11-02', length: 7, days: { rt_chest: 1, rt_back: 2, rt_legs: 4, rt_shoulders: 5 } });
  }
  return api;
}

describe('P2-19 coaching rules', () => {
  it('skills pair with the gym days that train the same muscles', () => {
    const api = setup(false);
    const back = api.state.routines.find((r) => r.id === 'rt_back');
    const legs = api.state.routines.find((r) => r.id === 'rt_legs');
    const sh = api.state.routines.find((r) => r.id === 'rt_shoulders');
    assert.ok(api.caliRoutineFit('frontlever', back) > api.caliRoutineFit('frontlever', legs));
    assert.ok(api.caliRoutineFit('handstand', sh) > api.caliRoutineFit('handstand', back));
    const pick = api.caliPickGymDays({ skill: 'handstand', per: 1, where: 'gym', routines: [] });
    assert.deepEqual(JSON.parse(JSON.stringify(pick)), ['rt_shoulders']);
  });

  it('a skill block goes first in the gym workout and is rebuilt, never doubled', () => {
    const api = setup(true);
    api.caliApplyGoals([{ skill: 'handstand', per: 1, where: 'gym', routines: [] }]);
    const sh = api.state.routines.find((r) => r.id === 'rt_shoulders');
    assert.match(sh.exercises[0].note, /^🤸 Handstand/);
    const n = sh.exercises.length;
    api.caliApplyGoals(api.state.cali.goals, true);
    assert.equal(api.state.routines.find((r) => r.id === 'rt_shoulders').exercises.length, n);
    api.caliApplyGoals([]);
    assert.ok(!api.state.routines.find((r) => r.id === 'rt_shoulders').exercises.some((e) => /^🤸/.test(e.note)), 'dropped goal removes the block');
  });

  it('a focus day joins your gym program on a free day', () => {
    const api = setup(true);
    api.caliApplyGoals([{ skill: 'frontlever', per: 1, where: 'focus', routines: [] }]);
    const rt = api.state.routines.find((r) => r.id === 'rt_cskill_frontlever_1');
    assert.ok(rt && /Front lever focus/.test(rt.name));
    assert.equal(rt.folderId, 'fd_default');
    const days = api.findFolder('fd_default').program.days;
    assert.ok(days.rt_cskill_frontlever_1 && ![1, 2, 4, 5].includes(days.rt_cskill_frontlever_1), 'free day');
    assert.ok(rt.exercises.some((e) => /support/.test(e.note)), 'support ladders');
  });

  it('straight-arm skills: never two days in a row, and a warning when you force it', () => {
    const api = setup(true);
    const notes = api.caliCoachNotes([{ skill: 'frontlever', per: 2, where: 'gym', routines: ['rt_chest', 'rt_back'] }]);
    assert.ok(notes.some((n) => /two days in a row/.test(n)));
    const picked = api.caliPickGymDays({ skill: 'frontlever', per: 2, where: 'gym', routines: [] });
    const day = (id) => api.findFolder('fd_default').program.days[id];
    assert.ok(Math.abs(day(picked[0]) - day(picked[1])) > 1, 'coach spreads them');
  });

  it('too many skills at once gets a coach note; a skill on the wrong day too', () => {
    const api = setup(true);
    const g = ['handstand', 'lsit', 'hspu', 'frontlever'].map((s) => ({ skill: s, per: 1, where: 'focus', routines: [] }));
    assert.ok(api.caliCoachNotes(g).some((n) => /4 skills/.test(n)));
    assert.ok(api.caliCoachNotes([{ skill: 'handstand', per: 1, where: 'gym', routines: ['rt_legs'] }]).some((n) => /suit it better/.test(n)));
  });

  it('a step-up rebuilds the block with the next step', () => {
    const api = setup(true);
    api.caliApplyGoals([{ skill: 'handstand', per: 1, where: 'gym', routines: ['rt_shoulders'] }]);
    const before = api.state.routines.find((r) => r.id === 'rt_shoulders').exercises.find((e) => /skill/.test(e.note)).exId;
    api.caliMoveStep('handstand', 1);
    const after = api.state.routines.find((r) => r.id === 'rt_shoulders').exercises.find((e) => /skill/.test(e.note)).exId;
    assert.notEqual(before, after);
  });

  it('Jev picks are merged and the rules fill the gaps', () => {
    const api = setup(true);
    api.openCaliGoals();
    const d = { goals: [], ask: 'x', heard: '' };
    const msg = api.caliMergePicks(d, { frontlever: { per: 2, where: 'focus' }, handstand: { routineId: 'rt_shoulders' } });
    assert.match(msg, /Understood/);
    const fl = d.goals.find((g) => g.skill === 'frontlever');
    assert.equal(fl.per, 2);
    assert.equal(fl.where, 'focus');
    const hs = d.goals.find((g) => g.skill === 'handstand');
    assert.equal(hs.where, 'gym');
    assert.deepEqual(JSON.parse(JSON.stringify(hs.routines)), ['rt_shoulders']);
  });

  it('a locked skill says what opens it, in the sheet and from the coach', () => {
    const api = setup(true);
    api.state.cali.pos.frontlever = 0;
    api.state.cali.pos.hang = 0;
    api.openCaliGoals();
    assert.equal(api.caliSkillOpen('frontlever'), false);
    const d = { goals: [], ask: 'x', heard: '' };
    const msg = api.caliMergePicks(d, { frontlever: { per: 2, where: 'focus' } });
    assert.match(msg, /Front lever opens after: .*Hanging L-Sit/);
    assert.equal(d.goals.length, 0, 'never added while locked');
  });

  it('the Jev key never appears in the app', () => {
    const html = loadIndexHtml();
    assert.ok(!html.includes('TYPESAFE_API_KEY'));
    assert.ok(!html.includes('api.typesafe.ai'));
  });
});

describe('P2-19 /api/coach', () => {
  const skills = [{ id: 'frontlever', name: 'Front lever', words: 'FL' }, { id: 'handstand', name: 'Handstand', words: 'HS' }];
  const routines = [{ id: 'rt_back', name: 'Back', muscles: 'Back' }, { id: 'rt_sh', name: 'Shoulders', muscles: 'Shoulders' }];

  it('asks Jev only typed questions from our options', () => {
    const q = buildCoachQuestions(skills, routines);
    assert.equal(q.want_frontlever.type, 'noul');
    assert.equal(q.per_frontlever.type, 'choice');
    assert.deepEqual(Object.keys(q.where_handstand.criteria).sort(), ['focus', 'full', 'gym', 'unsaid']);
    assert.ok(q.day_handstand.criteria.r1.startsWith('Shoulders'));
    for (const k of Object.keys(q)) if (q[k].type === 'choice') assert.ok(Object.keys(q[k].criteria).length <= 255);
  });

  it('reads answers; unsure picks are left to the rules', () => {
    const out = readCoachAnswers({
      want_frontlever: { type: 'noul', noul: 0.97 },
      per_frontlever: { type: 'choice', choice: '2', confidence: 0.9 },
      where_frontlever: { type: 'choice', choice: 'focus', confidence: 0.4 },
      want_handstand: { type: 'noul', noul: 0.92 },
      day_handstand: { type: 'choice', choice: 'r1', confidence: 0.8 }
    }, skills, routines);
    assert.equal(out.frontlever.per, 2);
    assert.equal(out.frontlever.where, null, 'low confidence');
    assert.equal(out.handstand.routineId, 'rt_sh');
  });

  beforeEach(() => resetRateLimits());

  function call(headers, body) {
    const req = { method: 'POST', headers, body };
    let data = '';
    const res = { statusCode: 200, setHeader() {}, end(d) { if (d) data += d; } };
    return coachHandler(req, res).then(() => ({ status: res.statusCode, body: JSON.parse(data || '{}') }));
  }

  it('refuses without a paired app, and says when the key is missing', async () => {
    assert.equal((await call({}, { text: 'hi' })).status, 401);
    delete process.env.TYPESAFE_API_KEY;
    assert.equal((await call({ authorization: 'Bearer tok' }, { text: 'hi', skills })).status, 503);
  });

  it('calls Jev with the server key and returns the picks', async () => {
    process.env.TYPESAFE_API_KEY = 'test-key';
    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
    const hash = hashToken('tok');
    let sent = null;
    globalThis.fetch = async (url, opt) => {
      if (String(url).includes('supabase')) return { ok: true, status: 200, json: async () => [{ owner_hash: hash, state: {}, rev: 1 }] };
      sent = { url: String(url), auth: opt.headers.Authorization, body: JSON.parse(opt.body) };
      return { ok: true, status: 200, json: async () => ({ model: 'jev-1.14.0', answers: {
        want_frontlever: { noul: 0.95 }, per_frontlever: { choice: '2', confidence: 0.9 }, where_frontlever: { choice: 'focus', confidence: 0.9 },
        want_handstand: { noul: 0.1 } } }) };
    };
    const r = await call({ authorization: 'Bearer tok' }, { text: 'front lever twice a week on its own day', skills, routines });
    assert.equal(r.status, 200);
    assert.equal(sent.url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(sent.auth, 'Bearer test-key');
    assert.equal(r.body.picks.frontlever.where, 'focus');
    assert.ok(!r.body.picks.handstand);
    delete process.env.TYPESAFE_API_KEY;
  });
});

describe('P2-19 home card', () => {
  it('each skill line opens the sheet at that skill', () => {
    const app = createApp();
    const api = app.api;
    api.state.cali = { gear: GEAR, gearSet: true, pos: { handstand: 4 }, tested: { date: '2026-11-01', level: 2 },
      goals: [{ skill: 'handstand', per: 2, where: 'focus', routines: [] }] };
    api.openCaliGoals('handstand');
    assert.ok(app.document.getElementById('caliGoal_handstand'), 'sheet has the skill card');
  });
});
