// api/coach.js — "Ask the coach": turns what the athlete says ("front lever
// twice a week on its own day, handstand on my shoulder day") into typed
// choices with TypeSafe Jev. Jev only picks from the options sent here; the
// app's own coaching rules then check and complete the plan, and the owner
// confirms it. Only a paired app (connector token) may call it, so nobody
// else can spend the Jev credit. The key stays on the server:
// TYPESAFE_API_KEY in the Vercel project settings.

import { hashToken, getOwnerRow, checkRateLimit } from './_supabase.js';
import { setCors, handlePreflight, sendJson, readJsonBody, bearerToken } from './_http.js';

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const JEV_MODEL = 'jev-1.14.0'; // pinned: thresholds below are tuned for it
const MAX_TEXT = 600;
const MAX_SKILLS = 12;
const MAX_ROUTINES = 30;

const WHERE = {
  gym: 'Added to one or more of the athlete\'s existing gym workouts or gym days',
  focus: 'Its own separate session or day dedicated only to this skill',
  full: 'Inside a full-body calisthenics program',
  unsaid: 'The athlete did not say where'
};
const PER = {
  '1': 'Once a week',
  '2': 'Twice a week',
  '3': 'Three times a week',
  unsaid: 'The athlete did not say how often'
};

function clean(s, n) {
  return String(s === null || s === undefined ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
}

/* Questions for Jev: per skill, does the athlete want it, how often, where,
   and on which gym workout. Pure, exported for tests. */
export function buildCoachQuestions(skills, routines) {
  const q = {};
  const days = { unsaid: 'The athlete did not name a gym workout or day for this skill' };
  routines.forEach((r, i) => {
    days['r' + i] = r.name + (r.muscles ? ' (trains ' + r.muscles + ')' : '');
  });
  skills.forEach(s => {
    const name = s.name + (s.words ? ' (also called ' + s.words + ')' : '');
    q['want_' + s.id] = { type: 'noul', instructions: 'Does the athlete say they want to train or develop ' + name + '?' };
    q['per_' + s.id] = { type: 'choice', instructions: 'How many sessions per week does the athlete want for ' + name + '?', criteria: PER };
    q['where_' + s.id] = { type: 'choice', instructions: 'Where does the athlete want to train ' + name + '?', criteria: WHERE };
    if (routines.length) {
      q['day_' + s.id] = { type: 'choice', instructions: 'Which of the athlete\'s gym workouts does the athlete want ' + name + ' added to?', criteria: days };
    }
  });
  return q;
}

/* Jev answers -> { skillId: { want, per, where, routineId } } for the skills
   the athlete asked for. Low-confidence picks become "unsaid" so the app's
   rules decide instead. */
export function readCoachAnswers(answers, skills, routines) {
  const out = {};
  const a = answers || {};
  const pick = (k, min) => {
    const x = a[k];
    if (!x || typeof x.choice !== 'string') return 'unsaid';
    return (typeof x.confidence === 'number' && x.confidence < min) ? 'unsaid' : x.choice;
  };
  skills.forEach(s => {
    const w = a['want_' + s.id];
    if (!w || typeof w.noul !== 'number' || w.noul < 0.5) return;
    const per = pick('per_' + s.id, 0.5);
    const where = pick('where_' + s.id, 0.5);
    const day = pick('day_' + s.id, 0.5);
    const r = /^r\d+$/.test(day) ? routines[Number(day.slice(1))] : null;
    out[s.id] = {
      want: Math.round(w.noul * 100) / 100,
      per: PER[per] && per !== 'unsaid' ? Number(per) : null,
      where: WHERE[where] && where !== 'unsaid' ? where : null,
      routineId: r ? r.id : null
    };
  });
  return out;
}

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS', 'Content-Type, Authorization');
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'POST only' });
    return;
  }
  const token = bearerToken(req);
  const ownerHash = hashToken(token);
  if (!ownerHash) {
    sendJson(res, 401, { error: 'Pair the app first (Profile → AI connector)' });
    return;
  }
  const rl = checkRateLimit('coach:' + ownerHash, 20, 60000);
  if (!rl.allowed) {
    sendJson(res, 429, { error: 'Too many requests, try again in ' + rl.retryAfter + ' s' }, { 'Retry-After': String(rl.retryAfter) });
    return;
  }
  const key = process.env.TYPESAFE_API_KEY || '';
  if (!key) {
    sendJson(res, 503, { error: 'The coach AI is not set up yet (TYPESAFE_API_KEY missing on the server)' });
    return;
  }
  const parsed = readJsonBody(req);
  if (!parsed.ok) {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }
  const body = parsed.body;
  const text = clean(body.text, MAX_TEXT);
  if (!text) {
    sendJson(res, 400, { error: 'Say what you want to train' });
    return;
  }
  const skills = (Array.isArray(body.skills) ? body.skills : []).slice(0, MAX_SKILLS)
    .map(s => ({ id: clean(s && s.id, 24).replace(/[^a-z0-9_]/gi, ''), name: clean(s && s.name, 40), words: clean(s && s.words, 80) }))
    .filter(s => s.id && s.name);
  const routines = (Array.isArray(body.routines) ? body.routines : []).slice(0, MAX_ROUTINES)
    .map(r => ({ id: clean(r && r.id, 60), name: clean(r && r.name, 60), muscles: clean(r && r.muscles, 80) }))
    .filter(r => r.id && r.name);
  if (!skills.length) {
    sendJson(res, 400, { error: 'No skills to pick from' });
    return;
  }

  try {
    const owner = await getOwnerRow(ownerHash);
    if (!owner) {
      sendJson(res, 401, { error: 'Unknown or revoked connector token' });
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    let r;
    try {
      r = await fetch(JEV_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: JEV_MODEL,
          state: { athlete_said: text, gym_workouts: routines.map(x => x.name) },
          questions: buildCoachQuestions(skills, routines)
        }),
        signal: ctrl.signal
      });
    } finally {
      clearTimeout(timer);
    }
    if (!r.ok) {
      sendJson(res, 502, { error: 'The coach AI did not answer (' + r.status + ')' });
      return;
    }
    const data = await r.json();
    sendJson(res, 200, { ok: true, model: data.model || JEV_MODEL, picks: readCoachAnswers(data.answers, skills, routines) });
  } catch (e) {
    sendJson(res, 502, { error: e && e.name === 'AbortError' ? 'The coach AI took too long' : 'The coach AI is not reachable' });
  }
}
