// api/mcp/[token].js — Remote MCP server for PLZ Train (Streamable HTTP, JSON-RPC 2.0).
// Compatible with Claude Custom Connectors and ChatGPT MCP Connectors.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  hashToken,
  checkRateLimit,
  getOwnerRow,
  saveStateWithHistory
} from '../_supabase.js';
import {
  validateRoutinePayload,
  formatRoutineErrors
} from '../../mcp/routine-format.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const cataloguePath = path.resolve(here, '../../mcp/catalogue.json');
let catalogue = null;
function getCatalogue() {
  if (!catalogue) {
    catalogue = JSON.parse(readFileSync(cataloguePath, 'utf8'));
  }
  return catalogue;
}

const SERVER_INFO = { name: 'plz-train', version: '1.0.0' };
const SUPPORTED_PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const TOOLS = [
  {
    name: 'get_overview',
    description: 'Get app summary: total workout, routine, exercise, and body counts, last workout summary, and this week volume in kg.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'list_workouts',
    description: 'List logged workouts. Optional filters: from (YYYY-MM-DD), to (YYYY-MM-DD), limit (1-100, default 20). Volumes are in kg.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date in YYYY-MM-DD' },
        to: { type: 'string', description: 'End date in YYYY-MM-DD' },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Default 20' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_workout',
    description: 'Get full details of a workout by ID: exercises, sets, weights (kg), reps, and notes.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Workout ID' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'get_records',
    description: 'Get personal records (PRs) in kg. Optional exId to inspect a specific exercise.',
    inputSchema: {
      type: 'object',
      properties: { exId: { type: 'string', description: 'Exercise ID, e.g. ex1' } },
      additionalProperties: false
    }
  },
  {
    name: 'get_body',
    description: 'Get body weight (kg) and measurement log. Dates in YYYY-MM-DD. Photos are never included.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date YYYY-MM-DD' },
        to: { type: 'string', description: 'End date YYYY-MM-DD' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'list_routines',
    description: 'List all saved routines with their exercises, target reps, and rest periods.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'list_exercises',
    description: 'List exercises from the built-in catalogue. Optional filters: muscle (e.g. Chest, Back) or equipment (e.g. Barbell, Dumbbell).',
    inputSchema: {
      type: 'object',
      properties: {
        muscle: { type: 'string', description: 'Target muscle group' },
        equipment: { type: 'string', description: 'Equipment type' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'create_routine',
    description: 'Create a new routine. Name 1-60 chars; exercises array of {exId, sets, reps (e.g. "8-12"), restSec?, note?}.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Routine name (1-60 characters)' },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              exId: { type: 'string', description: 'Built-in exercise ID (e.g. ex1)' },
              sets: { type: 'integer', minimum: 1, maximum: 10 },
              reps: { type: 'string', description: 'Rep range like "8" or "8-12"' },
              restSec: { type: 'integer', minimum: 0, maximum: 600 },
              note: { type: 'string', maxLength: 140 }
            },
            required: ['exId', 'sets', 'reps']
          }
        }
      },
      required: ['name', 'exercises'],
      additionalProperties: false
    }
  },
  {
    name: 'update_routine',
    description: 'Update an existing routine by ID. Optional new name and/or updated exercises.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Routine ID to update' },
        name: { type: 'string', description: 'New routine name' },
        exercises: { type: 'array', description: 'Updated exercise list' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'delete_routine',
    description: 'Delete a routine by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Routine ID' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'plan_week',
    description: 'Assign routines to days of the week. Parameter days maps mon..sun to routine name/id or "rest".',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'object',
          description: 'Keyed by mon, tue, wed, thu, fri, sat, sun with routine name/id or "rest"'
        }
      },
      required: ['days'],
      additionalProperties: false
    }
  },
  {
    name: 'add_body_entry',
    description: 'Log body weight in kg and optional measurements for a date (YYYY-MM-DD). Weight bounds: 20-500 kg.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        weightKg: { type: 'number', minimum: 20, maximum: 500, description: 'Weight in kg' },
        measures: { type: 'object', description: 'Optional measurements, e.g. { waist: 82 }' }
      },
      required: ['date', 'weightKg'],
      additionalProperties: false
    }
  },
  {
    name: 'log_workout',
    description: 'Log a completed workout. Name, optional date (YYYY-MM-DD or ms), and exercises array with weights in kg and reps.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Workout name / title' },
        date: { description: 'Date in YYYY-MM-DD or millisecond timestamp' },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              exId: { type: 'string', description: 'Exercise ID' },
              sets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    weight: { type: 'number', minimum: 0, maximum: 1000, description: 'Weight in kg' },
                    reps: { type: 'integer', minimum: 1, maximum: 1000, description: 'Reps completed' },
                    type: { type: 'string', description: 'Set type: normal, warmup, drop, failure' }
                  },
                  required: ['weight', 'reps']
                }
              }
            },
            required: ['exId', 'sets']
          }
        },
        note: { type: 'string', description: 'Optional workout note' }
      },
      required: ['name', 'exercises'],
      additionalProperties: false
    }
  }
];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mcp-version');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function extractToken(req) {
  if (req.query && req.query.token) return String(req.query.token).trim();
  const rawUrl = String(req.url || '');
  const match = rawUrl.match(/\/api\/mcp\/([^?#/]+)/);
  if (match) return match[1].trim();
  const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return '';
}

async function executeTool(toolName, args, owner, ownerHash) {
  const st = owner.state || {};
  const cat = getCatalogue();
  const validIds = cat.exercises.map(ex => ex.id);

  if (toolName === 'get_overview') {
    const history = Array.isArray(st.history) ? st.history : [];
    const routines = Array.isArray(st.routines) ? st.routines : [];
    const exercises = Array.isArray(st.exercises) ? st.exercises : [];
    const body = Array.isArray(st.body) ? st.body : [];

    let lastWorkout = 'No workouts recorded yet.';
    if (history.length > 0) {
      const last = history[0];
      const d = last.date ? new Date(last.date).toISOString().split('T')[0] : 'unknown';
      const name = last.name || last.title || 'Workout';
      const count = (last.exercises || []).length;
      const vol = Math.round(Number(last.totalVolume || 0));
      lastWorkout = `Last workout on ${d}: "${name}" (${count} exercises, ${vol} kg volume).`;
    }

    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    const thisWeek = history.filter(w => w.date && w.date >= startOfWeek.getTime());
    const weekVol = Math.round(thisWeek.reduce((sum, w) => sum + (Number(w.totalVolume) || 0), 0));

    const lines = [
      'PLZ Train Overview:',
      `- Workouts logged: ${history.length}`,
      `- Routines saved: ${routines.length}`,
      `- Exercises in catalogue: ${exercises.length || cat.exercises.length}`,
      `- Body log entries: ${body.length}`,
      '',
      lastWorkout,
      `This week: ${thisWeek.length} workout(s), ${weekVol} kg total volume.`
    ];
    return { text: lines.join('\n') };
  }

  if (toolName === 'list_workouts') {
    const limit = Math.min(Math.max(1, parseInt(args.limit) || 20), 100);
    let list = Array.isArray(st.history) ? st.history.slice() : [];
    if (args.from) {
      const t = new Date(args.from).getTime();
      if (!isNaN(t)) list = list.filter(w => w.date >= t);
    }
    if (args.to) {
      const toDate = new Date(args.to);
      toDate.setHours(23, 59, 59, 999);
      const t = toDate.getTime();
      if (!isNaN(t)) list = list.filter(w => w.date <= t);
    }
    list = list.slice(0, limit);
    if (list.length === 0) return { text: 'No workouts found matching criteria.' };

    const lines = list.map(w => {
      const d = w.date ? new Date(w.date).toISOString().split('T')[0] : 'unknown';
      const name = w.name || w.title || 'Workout';
      const count = (w.exercises || []).length;
      const vol = Math.round(Number(w.totalVolume || 0));
      return `ID: ${w.id} | Date: ${d} | "${name}" | ${count} exercises | Volume: ${vol} kg`;
    });
    return { text: lines.join('\n') };
  }

  if (toolName === 'get_workout') {
    const w = (st.history || []).find(it => String(it.id) === String(args.id));
    if (!w) return { isError: true, text: `Workout not found: ${args.id}` };
    const exLines = (w.exercises || []).map(ex => {
      const name = ex.name || (cat.exercises.find(e => e.id === ex.exId) || {}).name || ex.exId;
      const setLines = (ex.sets || []).map((s, idx) => `  Set ${idx + 1}: ${s.weight} kg × ${s.reps}${s.type ? ' (' + s.type + ')' : ''}`).join('\n');
      return `${name} (${ex.exId}):\n${setLines}`;
    }).join('\n\n');

    const d = w.date ? new Date(w.date).toISOString().split('T')[0] : 'unknown';
    const text = [
      `Workout ID: ${w.id}`,
      `Date: ${d}`,
      `Name: ${w.name || w.title || 'Workout'}`,
      `Volume: ${Math.round(w.totalVolume || 0)} kg`,
      w.note ? `Note: ${w.note}` : '',
      '',
      exLines
    ].filter(Boolean).join('\n');
    return { text };
  }

  if (toolName === 'get_records') {
    const history = Array.isArray(st.history) ? st.history : [];
    const exId = args.exId ? String(args.exId).trim() : '';
    const records = new Map(); // exId -> { maxWeight, max1RM, maxVol, exName }

    history.forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (exId && ex.exId !== exId) return;
        const entry = records.get(ex.exId) || {
          exId: ex.exId,
          maxWeight: 0,
          max1RM: 0,
          maxVol: 0
        };
        let setVolSum = 0;
        (ex.sets || []).forEach(s => {
          const wt = Number(s.weight) || 0;
          const rp = Number(s.reps) || 0;
          if (wt > entry.maxWeight) entry.maxWeight = wt;
          // Epley 1RM: weight * (1 + reps/30) for reps 1..12
          if (rp >= 1 && rp <= 12) {
            const epley = wt * (1 + rp / 30);
            if (epley > entry.max1RM) entry.max1RM = Math.round(epley * 10) / 10;
          }
          setVolSum += (wt * rp);
        });
        if (setVolSum > entry.maxVol) entry.maxVol = Math.round(setVolSum);
        records.set(ex.exId, entry);
      });
    });

    if (records.size === 0) return { text: exId ? `No records found for ${exId}.` : 'No exercise records found.' };

    const lines = Array.from(records.values()).map(r => {
      const match = cat.exercises.find(e => e.id === r.exId);
      const name = match ? match.name : r.exId;
      return `${name} (${r.exId}): Max weight ${r.maxWeight} kg | Estimated 1RM ${r.max1RM} kg | Max set volume ${r.maxVol} kg`;
    });
    return { text: lines.join('\n') };
  }

  if (toolName === 'get_body') {
    let list = Array.isArray(st.body) ? st.body.slice() : [];
    if (args.from) list = list.filter(b => b.date >= args.from);
    if (args.to) list = list.filter(b => b.date <= args.to);
    if (list.length === 0) return { text: 'No body measurement entries found in this range.' };

    const lines = list.map(b => {
      const wt = b.weightKg ? `${b.weightKg} kg` : 'no weight';
      const m = b.measures && Object.keys(b.measures).length > 0
        ? ' (' + Object.entries(b.measures).map(([k, v]) => `${k}: ${v}`).join(', ') + ')'
        : '';
      return `${b.date}: ${wt}${m}`;
    });
    return { text: lines.join('\n') };
  }

  if (toolName === 'list_routines') {
    const routines = Array.isArray(st.routines) ? st.routines : [];
    if (routines.length === 0) return { text: 'No routines saved.' };

    const blocks = routines.map(r => {
      const exLines = (r.exercises || []).map(item => {
        const match = cat.exercises.find(e => e.id === item.exId);
        const name = match ? match.name : item.exId;
        const target = item.targetReps || (item.targetRepsMin ? `${item.targetRepsMin}-${item.targetRepsMax}` : 'reps');
        const rest = item.restSec ? ` · rest ${item.restSec}s` : '';
        const note = item.note ? ` · "${item.note}"` : '';
        return `  - ${name} (${item.exId}): ${item.sets} × ${target}${rest}${note}`;
      }).join('\n');
      return `Routine: "${r.name}" (ID: ${r.id})\n${exLines}`;
    });
    return { text: blocks.join('\n\n') };
  }

  if (toolName === 'list_exercises') {
    const muscle = args.muscle ? String(args.muscle).toLowerCase() : '';
    const equipment = args.equipment ? String(args.equipment).toLowerCase() : '';
    const items = cat.exercises.filter(ex => {
      if (muscle && String(ex.muscle).toLowerCase() !== muscle && String(ex.primary).toLowerCase() !== muscle) return false;
      if (equipment && String(ex.equipment).toLowerCase() !== equipment) return false;
      return true;
    });
    if (items.length === 0) return { text: 'No exercises match the filter.' };
    const lines = items.map(ex => `${ex.id} | ${ex.name} | ${ex.equipment} | ${ex.primary} | ${ex.type}`);
    return { text: lines.join('\n') };
  }

  // WRITING TOOLS: all bump rev, save history, record updated_by='ai'
  if (toolName === 'create_routine') {
    const payload = { plzTrainRoutine: 1, name: args.name, exercises: args.exercises };
    const val = validateRoutinePayload(payload, validIds);
    if (!val.ok) {
      return { isError: true, text: 'Routine rejected:\n' + formatRoutineErrors(val.errors) };
    }

    const newRoutine = {
      id: 'rt_' + Date.now(),
      name: val.routine.name,
      exercises: val.routine.exercises.map(item => ({
        exId: item.exId,
        sets: item.sets,
        targetReps: item.reps,
        restSec: item.restSec,
        note: item.note || ''
      }))
    };

    if (!Array.isArray(st.routines)) st.routines = [];
    st.routines.unshift(newRoutine);

    const newRev = Number(owner.rev || 0) + 1;
    const summary = `Created routine "${newRoutine.name}"`;
    await saveStateWithHistory(ownerHash, st, newRev, 'ai', summary);

    return { text: `Routine "${newRoutine.name}" created (ID: ${newRoutine.id}). Synced at rev ${newRev}.` };
  }

  if (toolName === 'update_routine') {
    if (!Array.isArray(st.routines)) st.routines = [];
    const rt = st.routines.find(r => r.id === args.id);
    if (!rt) return { isError: true, text: `Routine not found: ${args.id}` };

    if (args.name) rt.name = String(args.name).trim();
    if (args.exercises) {
      const payload = { plzTrainRoutine: 1, name: rt.name, exercises: args.exercises };
      const val = validateRoutinePayload(payload, validIds);
      if (!val.ok) {
        return { isError: true, text: 'Routine update rejected:\n' + formatRoutineErrors(val.errors) };
      }
      rt.exercises = val.routine.exercises.map(item => ({
        exId: item.exId,
        sets: item.sets,
        targetReps: item.reps,
        restSec: item.restSec,
        note: item.note || ''
      }));
    }

    const newRev = Number(owner.rev || 0) + 1;
    const summary = `Updated routine "${rt.name}"`;
    await saveStateWithHistory(ownerHash, st, newRev, 'ai', summary);

    return { text: `Routine "${rt.name}" updated. Synced at rev ${newRev}.` };
  }

  if (toolName === 'delete_routine') {
    if (!Array.isArray(st.routines)) st.routines = [];
    const idx = st.routines.findIndex(r => r.id === args.id);
    if (idx === -1) return { isError: true, text: `Routine not found: ${args.id}` };

    const name = st.routines[idx].name;
    st.routines.splice(idx, 1);

    const newRev = Number(owner.rev || 0) + 1;
    const summary = `Deleted routine "${name}"`;
    await saveStateWithHistory(ownerHash, st, newRev, 'ai', summary);

    return { text: `Routine "${name}" deleted. Synced at rev ${newRev}.` };
  }

  if (toolName === 'plan_week') {
    if (!args.days || typeof args.days !== 'object') {
      return { isError: true, text: 'days must be an object mapping days of the week to routines or "rest".' };
    }
    st.plans = Object.assign({}, st.plans || {}, args.days);

    const newRev = Number(owner.rev || 0) + 1;
    const summary = 'Updated weekly workout plan';
    await saveStateWithHistory(ownerHash, st, newRev, 'ai', summary);

    return { text: `Weekly plan updated. Synced at rev ${newRev}.` };
  }

  if (toolName === 'add_body_entry') {
    const date = String(args.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { isError: true, text: 'date must be in YYYY-MM-DD format.' };
    }
    const wt = Number(args.weightKg);
    if (!isFinite(wt) || wt < 20 || wt > 500) {
      return { isError: true, text: 'weightKg must be a number between 20 and 500 kg.' };
    }

    if (!Array.isArray(st.body)) st.body = [];
    const measures = (args.measures && typeof args.measures === 'object') ? args.measures : {};
    const entry = {
      id: 'body-' + date,
      date: date,
      weightKg: Math.round(wt * 100) / 100,
      measures: measures
    };

    const existingIdx = st.body.findIndex(b => b.date === date);
    if (existingIdx >= 0) st.body[existingIdx] = entry;
    else st.body.push(entry);
    st.body.sort((a, b) => a.date.localeCompare(b.date));

    const newRev = Number(owner.rev || 0) + 1;
    const summary = `Logged body weight ${entry.weightKg} kg on ${date}`;
    await saveStateWithHistory(ownerHash, st, newRev, 'ai', summary);

    return { text: `Body entry for ${date} (${entry.weightKg} kg) saved. Synced at rev ${newRev}.` };
  }

  if (toolName === 'log_workout') {
    const w = args.workout || args;
    if (!w || typeof w !== 'object') return { isError: true, text: 'workout must be an object' };
    const name = String(w.name || w.title || 'Workout').trim();
    if (!name) return { isError: true, text: 'workout name is required' };
    const exercises = Array.isArray(w.exercises) ? w.exercises : [];
    if (exercises.length === 0) return { isError: true, text: 'workout must contain at least one exercise' };

    const knownIds = new Set(validIds);
    let totalVol = 0;
    const cleanEx = [];

    for (let i = 0; i < exercises.length; i++) {
      const item = exercises[i];
      if (!item || !item.exId || !knownIds.has(item.exId)) {
        return { isError: true, text: `Exercise index ${i} has invalid exId "${item ? item.exId : ''}".` };
      }
      const sets = Array.isArray(item.sets) ? item.sets : [];
      if (sets.length === 0) return { isError: true, text: `Exercise ${item.exId} needs at least one set.` };
      const cleanSets = [];
      for (let sIdx = 0; sIdx < sets.length; sIdx++) {
        const s = sets[sIdx];
        const wt = Number(s.weight !== undefined ? s.weight : 0);
        const rp = Number(s.reps !== undefined ? s.reps : 0);
        if (!isFinite(wt) || wt < 0 || wt > 1000) return { isError: true, text: `Set ${sIdx + 1} has invalid weight (0-1000 kg).` };
        if (!isFinite(rp) || Math.floor(rp) !== rp || rp < 1 || rp > 1000) return { isError: true, text: `Set ${sIdx + 1} has invalid reps (1-1000).` };
        cleanSets.push({ weight: Math.round(wt * 100) / 100, reps: rp, type: s.type || 'normal' });
        totalVol += (wt * rp);
      }
      cleanEx.push({ exId: item.exId, sets: cleanSets });
    }

    let dateMs = Date.now();
    if (w.date) {
      const parsed = typeof w.date === 'number' ? w.date : new Date(w.date).getTime();
      if (!isNaN(parsed)) dateMs = parsed;
    }

    const newWorkout = {
      id: 'w_' + Date.now(),
      name: name,
      date: dateMs,
      exercises: cleanEx,
      totalVolume: Math.round(totalVol * 100) / 100,
      note: typeof w.note === 'string' ? w.note.slice(0, 500) : ''
    };

    if (!Array.isArray(st.history)) st.history = [];
    st.history.unshift(newWorkout);

    const newRev = Number(owner.rev || 0) + 1;
    const summary = `Logged workout "${name}"`;
    await saveStateWithHistory(ownerHash, st, newRev, 'ai', summary);

    return { text: `Workout "${name}" logged (ID: ${newWorkout.id}, Volume: ${newWorkout.totalVolume} kg). Synced at rev ${newRev}.` };
  }

  return { isError: true, text: `Unknown tool: ${toolName}` };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed. MCP uses POST for JSON-RPC 2.0.' }));
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const token = extractToken(req);
  const ownerHash = hashToken(token);
  if (!ownerHash) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32001, message: 'Unauthorized: missing connector token' }
    }));
    return;
  }

  // Rate limiting per token (60 req / min)
  const rl = checkRateLimit('mcp:' + ownerHash, 60, 60000);
  if (!rl.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(rl.retryAfter));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32029, message: 'Rate limit exceeded. Please wait a moment.' }
    }));
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      }));
      return;
    }
  }

  const msg = body || {};
  const hasId = msg.id !== undefined && msg.id !== null;

  // Handle notification initialized (accept with 202)
  if (msg.method === 'notifications/initialized') {
    res.statusCode = 202;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  try {
    const owner = await getOwnerRow(ownerHash);
    if (!owner) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: hasId ? msg.id : null,
        error: { code: -32001, message: 'Unauthorized: invalid or unknown connector token' }
      }));
      return;
    }

    if (msg.method === 'initialize') {
      const clientProtocol = (msg.params && typeof msg.params.protocolVersion === 'string')
        ? msg.params.protocolVersion
        : '2025-06-18';
      const protocolVersion = SUPPORTED_PROTOCOLS.includes(clientProtocol)
        ? clientProtocol
        : '2025-06-18';

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: protocolVersion,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO
        }
      }));
      return;
    }

    if (msg.method === 'ping') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: {} }));
      return;
    }

    if (msg.method === 'tools/list') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: TOOLS }
      }));
      return;
    }

    if (msg.method === 'tools/call') {
      const p = msg.params || {};
      const toolName = String(p.name || '');
      const toolArgs = (p.arguments && typeof p.arguments === 'object') ? p.arguments : {};
      const r = await executeTool(toolName, toolArgs, owner, ownerHash);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          content: [{ type: 'text', text: r.text }],
          isError: !!r.isError
        }
      }));
      return;
    }

    if (!hasId) {
      res.statusCode = 204;
      res.end();
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: msg.id,
      error: { code: -32601, message: 'Method not found: ' + msg.method }
    }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: hasId ? msg.id : null,
      error: { code: -32603, message: 'Internal error: ' + (err.message || 'unknown') }
    }));
  }
}
