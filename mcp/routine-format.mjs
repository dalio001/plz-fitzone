// mcp/routine-format.mjs — the P4-11 phase 1 routine contract.
//
// One place owns the rules, the caps and the EXACT error text. index.html keeps
// a deliberate copy of the same validator (the app is one self-contained file
// and cannot import a module); tests/mcp_routine.test.mjs proves both copies
// agree on every case. If you change a rule or a message here, change the
// copy in index.html and keep the table green.
//
// No dependencies, no network, no storage: pure functions only.

export const ROUTINE_FORMAT_VERSION = 1;
export const APP_URL = 'https://workout-engine-beta.vercel.app';
export const ROUTINE_HASH_KEY = 'import-routine';
export const MAX_EXERCISES = 20;
export const MAX_NAME = 60;
export const MAX_SETS = 10;
export const MAX_REPS = 100;
export const MAX_REST_SEC = 600;
export const MAX_NOTE = 140;
export const ERROR_LIMIT = 8;

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function got(value) {
  return String(value);
}

/* "8" / "8-12" (surrounding spaces ignored) -> { min, max, reps }. Anything
   else -> null. Bounds and order are checked by the caller so every failure
   gets its own message. */
export function parseRoutineReps(reps) {
  if (typeof reps !== 'string') return null;
  const m = /^(\d+)(?:-(\d+))?$/.exec(reps.trim());
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const max = (m[2] === undefined) ? min : parseInt(m[2], 10);
  return { min: min, max: max, reps: (min === max) ? String(min) : min + '-' + max };
}

/* Validates a `plzTrainRoutine` payload against the built-in exercise ids.
   Returns { ok:true, routine } with a normalised routine
   ({ name, exercises:[{exId, sets, reps, restSec|null, note}] }) or
   { ok:false, errors:[...] } with every problem found. Never mutates input. */
export function validateRoutinePayload(payload, ids) {
  const known = {};
  (Array.isArray(ids) ? ids : []).forEach(function (id) { known[String(id)] = true; });

  if (!isObject(payload)) {
    return { ok: false, errors: ['payload must be a JSON object (got ' + got(payload) + ')'] };
  }

  const errors = [];
  if (payload.plzTrainRoutine !== ROUTINE_FORMAT_VERSION) {
    errors.push('plzTrainRoutine must be 1 (got ' + got(payload.plzTrainRoutine) + ')');
  }

  const name = (typeof payload.name === 'string') ? payload.name.trim() : null;
  if (name === null || name.length < 1 || name.length > MAX_NAME) {
    errors.push('name must be 1–' + MAX_NAME + ' characters (got ' + (name === null ? got(payload.name) : name.length) + ')');
  }

  const list = payload.exercises;
  const exercises = [];
  if (!Array.isArray(list) || list.length < 1 || list.length > MAX_EXERCISES) {
    errors.push('exercises must be an array of 1–' + MAX_EXERCISES + ' exercises (got ' + (Array.isArray(list) ? list.length : got(list)) + ')');
  } else {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!isObject(item)) {
        errors.push('exercises[' + i + '] must be an object (got ' + got(item) + ')');
        continue;
      }

      if (typeof item.exId !== 'string' || known[item.exId] !== true) {
        errors.push('exercises[' + i + '].exId must be one of the built-in exercise ids (got ' + got(item.exId) + ')');
      }

      const sets = item.sets;
      if (typeof sets !== 'number' || Math.floor(sets) !== sets || sets < 1 || sets > MAX_SETS) {
        errors.push('exercises[' + i + '].sets must be a whole number 1–' + MAX_SETS + ' (got ' + got(sets) + ')');
      }

      const parsed = parseRoutineReps(item.reps);
      if (!parsed) {
        errors.push('exercises[' + i + '].reps must be a string like "8" or "8-12" (got ' + got(item.reps) + ')');
      } else if (parsed.min < 1 || parsed.max < 1 || parsed.min > MAX_REPS || parsed.max > MAX_REPS) {
        errors.push('exercises[' + i + '].reps must be 1–' + MAX_REPS + ' (got ' + got(item.reps) + ')');
      } else if (parsed.min > parsed.max) {
        errors.push('exercises[' + i + '].reps min must not be greater than max (got ' + got(item.reps) + ')');
      }

      let restSec = null;
      if (item.restSec !== undefined && item.restSec !== null) {
        if (typeof item.restSec !== 'number' || Math.floor(item.restSec) !== item.restSec ||
            item.restSec < 0 || item.restSec > MAX_REST_SEC) {
          errors.push('exercises[' + i + '].restSec must be a whole number 0–' + MAX_REST_SEC + ' (got ' + got(item.restSec) + ')');
        } else {
          restSec = item.restSec;
        }
      }

      let note = '';
      if (item.note !== undefined && item.note !== null) {
        if (typeof item.note !== 'string') {
          errors.push('exercises[' + i + '].note must be text up to ' + MAX_NOTE + ' characters (got ' + got(item.note) + ')');
        } else if (item.note.length > MAX_NOTE) {
          errors.push('exercises[' + i + '].note must be at most ' + MAX_NOTE + ' characters (got ' + item.note.length + ')');
        } else {
          note = item.note;
        }
      }

      exercises.push({
        exId: item.exId,
        sets: sets,
        reps: parsed ? parsed.reps : String(item.reps),
        restSec: restSec,
        note: note
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors: errors };
  return { ok: true, routine: { name: name, exercises: exercises } };
}

/* The text shown to a person: at most ERROR_LIMIT lines plus a count. The app
   copy produces the same string from the same array. */
export function formatRoutineErrors(errors) {
  const all = Array.isArray(errors) ? errors : [];
  const shown = all.slice(0, ERROR_LIMIT);
  const more = all.length - shown.length;
  let text = shown.join('\n');
  if (more > 0) text += (text ? '\n' : '') + 'and ' + more + ' more';
  return text;
}

/* Routine -> the payload that travels in a link or file. */
export function buildRoutinePayload(routine) {
  const src = (routine && typeof routine === 'object') ? routine : {};
  const items = Array.isArray(src.exercises) ? src.exercises : [];
  return {
    plzTrainRoutine: ROUTINE_FORMAT_VERSION,
    name: String(src.name === undefined || src.name === null ? '' : src.name),
    exercises: items.map(function (item) {
      const out = {
        exId: String((item && item.exId) || ''),
        sets: Number(item && item.sets),
        reps: String((item && item.reps) || '')
      };
      if (item && item.restSec !== undefined && item.restSec !== null) out.restSec = Number(item.restSec);
      if (item && typeof item.note === 'string' && item.note !== '') out.note = item.note;
      return out;
    })
  };
}

/* UTF-8 -> base64url, using Buffer (Node 18+). */
export function encodeBase64Url(text) {
  return Buffer.from(String(text), 'utf8').toString('base64url');
}

export function decodeBase64Url(text) {
  return Buffer.from(String(text), 'base64url').toString('utf8');
}

/* A routine -> the full import link the owner opens on the phone. */
export function encodeRoutineLink(routine) {
  const payload = buildRoutinePayload(routine);
  return APP_URL + '/#' + ROUTINE_HASH_KEY + '=' + encodeBase64Url(JSON.stringify(payload));
}

/* An import link (or a bare hash / base64url value) -> parsed payload.
   Throws when the link is not decodable or not JSON. */
export function decodeRoutineLink(link) {
  const raw = String(link || '');
  const marker = '#' + ROUTINE_HASH_KEY + '=';
  const at = raw.indexOf(marker);
  const value = at >= 0 ? raw.slice(at + marker.length) : raw.replace(/^#/, '');
  return JSON.parse(decodeBase64Url(value));
}
