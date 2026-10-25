#!/usr/bin/env node
// mcp/plz-train-mcp.mjs — PLZ Train local MCP server (P4-11 phase 1).
//
// A tiny stdio MCP server: newline-delimited JSON-RPC 2.0 on stdin, answers on
// stdout. No npm dependencies, no network, no keys, no files written: every
// tool is a pure function over the committed catalogue or the routine rules.
//
// Tools:
//   list_exercises      filter the built-in catalogue
//   get_routine_format  the rules + an example payload
//   create_routine      validate a routine and return an import link
//
// Run it from any MCP client: node <path>/mcp/plz-train-mcp.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';
import {
  ROUTINE_FORMAT_VERSION,
  APP_URL,
  ROUTINE_HASH_KEY,
  MAX_EXERCISES,
  MAX_NAME,
  MAX_SETS,
  MAX_REPS,
  MAX_REST_SEC,
  MAX_NOTE,
  validateRoutinePayload,
  buildRoutinePayload,
  encodeRoutineLink,
  formatRoutineErrors
} from './routine-format.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CATALOGUE_PATH = path.join(here, 'catalogue.json');
const SERVER_INFO = { name: 'plz-train', version: '1.0.0' };

let catalogue = null;
function getCatalogue() {
  if (!catalogue) {
    catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8'));
  }
  return catalogue;
}

function exerciseLine(ex) {
  const secondary = (ex.secondary && ex.secondary.length > 0)
    ? ' + ' + ex.secondary.join(' + ')
    : '';
  return ex.id + ' | ' + ex.name + ' | ' + ex.equipment + ' | ' + ex.primary + secondary + ' | ' + ex.type;
}

function listExercises(args) {
  const a = (args && typeof args === 'object') ? args : {};
  const muscle = a.muscle ? String(a.muscle).toLowerCase() : '';
  const equipment = a.equipment ? String(a.equipment).toLowerCase() : '';
  const items = getCatalogue().exercises.filter(function (ex) {
    if (muscle && String(ex.muscle).toLowerCase() !== muscle) return false;
    if (equipment && String(ex.equipment).toLowerCase() !== equipment) return false;
    return true;
  });
  if (items.length === 0) return 'No exercises match.';
  return items.map(exerciseLine).join('\n');
}

function routineFormat() {
  const example = {
    plzTrainRoutine: ROUTINE_FORMAT_VERSION,
    name: 'Push Day',
    exercises: [
      { exId: 'ex1', sets: 3, reps: '8-12', restSec: 90, note: 'Easy first set' },
      { exId: 'ex11', sets: 3, reps: '8' },
      { exId: 'ex14', sets: 3, reps: '10-15', restSec: 60 }
    ]
  };
  return [
    'PLZ Train routine format v' + ROUTINE_FORMAT_VERSION,
    '',
    'Rules:',
    '- plzTrainRoutine must be 1.',
    '- name: 1–' + MAX_NAME + ' characters (trimmed).',
    '- exercises: 1–' + MAX_EXERCISES + ' items; ids come from list_exercises (ex1..ex100).',
    '- sets: whole number 1–' + MAX_SETS + '.',
    '- reps: a string like "8" or "8-12" (each 1–' + MAX_REPS + ', min <= max).',
    '- restSec: optional whole number 0–' + MAX_REST_SEC + ' seconds.',
    '- note: optional text up to ' + MAX_NOTE + ' characters.',
    '',
    'Example payload:',
    JSON.stringify(example, null, 2),
    '',
    'create_routine returns a link starting ' + APP_URL + '/#' + ROUTINE_HASH_KEY + '=',
    'Open it on the phone, check the preview, then tap "Add routine".'
  ].join('\n');
}

function createRoutine(args) {
  const a = (args && typeof args === 'object') ? args : {};
  let payload;
  if (a.payload && typeof a.payload === 'object') payload = a.payload;
  else if (a.routine && typeof a.routine === 'object') payload = a.routine;
  else payload = a;
  if (payload.plzTrainRoutine === undefined) {
    payload = Object.assign({}, payload, { plzTrainRoutine: ROUTINE_FORMAT_VERSION });
  }

  const ids = getCatalogue().exercises.map(function (ex) { return ex.id; });
  const result = validateRoutinePayload(payload, ids);
  if (!result.ok) {
    return {
      isError: true,
      text: 'Routine rejected; nothing was created.\n' + formatRoutineErrors(result.errors)
    };
  }

  const built = buildRoutinePayload(result.routine);
  const link = encodeRoutineLink(result.routine);
  return {
    isError: false,
    text: [
      'Routine "' + result.routine.name + '" is ready.',
      '',
      'Import link:',
      link,
      '',
      'Open it on the phone, check the preview, then tap "Add routine".',
      '',
      'Routine JSON:',
      JSON.stringify(built, null, 2)
    ].join('\n')
  };
}

const TOOLS = [
  {
    name: 'list_exercises',
    description: 'List the built-in PLZ Train exercises (id, name, equipment, muscles, type). Optional exact filters: muscle and equipment.',
    inputSchema: {
      type: 'object',
      properties: {
        muscle: { type: 'string', description: 'e.g. Chest, Back, Quads, Full body' },
        equipment: { type: 'string', description: 'e.g. Barbell, Dumbbell, Machine, Cable, Bodyweight' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_routine_format',
    description: 'Show the routine rules and an example payload for create_routine.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'create_routine',
    description: 'Validate a routine and return a PLZ Train import link plus the routine JSON. Never writes to the app; the owner previews and confirms on the phone.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Routine name, 1–60 characters' },
        exercises: {
          type: 'array',
          minItems: 1,
          maxItems: MAX_EXERCISES,
          items: {
            type: 'object',
            properties: {
              exId: { type: 'string', description: 'An id from list_exercises' },
              sets: { type: 'integer', minimum: 1, maximum: MAX_SETS },
              reps: { type: 'string', description: '"8" or "8-12"' },
              restSec: { type: 'integer', minimum: 0, maximum: MAX_REST_SEC },
              note: { type: 'string', maxLength: MAX_NOTE }
            },
            required: ['exId', 'sets', 'reps'],
            additionalProperties: false
          }
        }
      },
      required: ['name', 'exercises'],
      additionalProperties: true
    }
  }
];

function toolResult(toolName, args) {
  if (toolName === 'list_exercises') {
    return { content: [{ type: 'text', text: listExercises(args) }] };
  }
  if (toolName === 'get_routine_format') {
    return { content: [{ type: 'text', text: routineFormat() }] };
  }
  if (toolName === 'create_routine') {
    const r = createRoutine(args);
    return { content: [{ type: 'text', text: r.text }], isError: r.isError };
  }
  return {
    content: [{ type: 'text', text: 'Unknown tool: ' + toolName }],
    isError: true
  };
}

export function handleMessage(msg) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id: (msg && msg.id !== undefined) ? msg.id : null, error: { code: -32600, message: 'Invalid Request' } };
  }
  const method = String(msg.method || '');
  const hasId = msg.id !== undefined && msg.id !== null;

  // Notifications (initialized/notifications/*) never get a reply.
  if (!hasId && method.indexOf('notifications/') === 0) return null;

  if (method === 'initialize') {
    const params = (msg.params && typeof msg.params === 'object') ? msg.params : {};
    const protocolVersion = typeof params.protocolVersion === 'string'
      ? params.protocolVersion
      : '2024-11-05';
    return {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: protocolVersion,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO
      }
    };
  }
  if (method === 'ping') {
    return { jsonrpc: '2.0', id: msg.id, result: {} };
  }
  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } };
  }
  if (method === 'tools/call') {
    const params = (msg.params && typeof msg.params === 'object') ? msg.params : {};
    return { jsonrpc: '2.0', id: msg.id, result: toolResult(String(params.name || ''), params.arguments || {}) };
  }
  if (!hasId) return null;
  return {
    jsonrpc: '2.0',
    id: msg.id,
    error: { code: -32601, message: 'Method not found: ' + method }
  };
}

function startServer() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on('line', function (line) {
    const text = String(line || '').trim();
    if (!text) return;
    let msg;
    try {
      msg = JSON.parse(text);
    } catch (e) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      }) + '\n');
      return;
    }
    let reply;
    try {
      reply = handleMessage(msg);
    } catch (e) {
      reply = {
        jsonrpc: '2.0',
        id: (msg && msg.id !== undefined) ? msg.id : null,
        error: { code: -32603, message: 'Internal error' }
      };
    }
    if (reply) process.stdout.write(JSON.stringify(reply) + '\n');
  });
}

const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) startServer();
