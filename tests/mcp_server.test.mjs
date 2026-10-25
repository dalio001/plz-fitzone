// tests/mcp_server.test.mjs — P4-11 phase 1 local MCP server, over real stdio.
// Spawns node mcp/plz-train-mcp.mjs, speaks newline JSON-RPC 2.0, and decodes
// the returned import link back through mcp/routine-format.mjs.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import {
  APP_URL,
  ROUTINE_HASH_KEY,
  decodeRoutineLink,
  validateRoutinePayload
} from '../mcp/routine-format.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '..');
const SERVER_PATH = path.join(REPO_ROOT, 'mcp', 'plz-train-mcp.mjs');
const CATALOGUE_PATH = path.join(REPO_ROOT, 'mcp', 'catalogue.json');

function startServer() {
  const child = spawn(process.execPath, [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });
  const pending = [];
  const waiters = [];
  const errors = [];
  child.stderr.on('data', (d) => errors.push(String(d)));
  const rl = readline.createInterface({ input: child.stdout, terminal: false });
  rl.on('line', (line) => {
    const text = String(line).trim();
    if (!text) return;
    const msg = JSON.parse(text);
    const waiter = waiters.shift();
    if (waiter) waiter(msg);
    else pending.push(msg);
  });
  let nextId = 1;
  function send(method, params, id) {
    const msg = { jsonrpc: '2.0', method: method };
    if (params !== undefined) msg.params = params;
    if (id !== undefined) msg.id = id;
    child.stdin.write(JSON.stringify(msg) + '\n');
    return msg;
  }
  function next(timeoutMs = 5000) {
    if (pending.length > 0) return Promise.resolve(pending.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for a JSON-RPC reply')), timeoutMs);
      waiters.push((msg) => { clearTimeout(timer); resolve(msg); });
    });
  }
  async function request(method, params) {
    const id = nextId++;
    send(method, params, id);
    return next();
  }
  function close() {
    try { rl.close(); } catch (e) {}
    try { child.stdin.end(); } catch (e) {}
    try { child.kill(); } catch (e) {}
  }
  return { child, send, next, request, close, errors };
}

function catalogueIds() {
  return JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8')).exercises.map((ex) => ex.id);
}

describe('P4-11 MCP server: handshake and discovery', () => {
  it('mcp-initialize-and-tools-list', async () => {
    const server = startServer();
    try {
      const init = await server.request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test', version: '1' }
      });
      assert.equal(init.jsonrpc, '2.0');
      assert.equal(init.result.protocolVersion, '2025-06-18', 'client protocol version echoed');
      assert.deepEqual(init.result.capabilities.tools, {}, 'tools capability advertised');
      assert.equal(init.result.serverInfo.name, 'plz-train');

      // Notifications never get a reply: the ping reply must be next.
      server.send('notifications/initialized');
      const pong = await server.request('ping', {});
      assert.deepEqual(pong.result, {}, 'notification was silent, ping answered');

      const list = await server.request('tools/list', {});
      const names = list.result.tools.map((t) => t.name);
      assert.deepEqual(names.sort(), ['create_routine', 'get_routine_format', 'list_exercises']);

      const exercises = await server.request('tools/call', { name: 'list_exercises', arguments: { muscle: 'Quads' } });
      assert.ok(!exercises.result.isError, 'list_exercises ok');
      const text = exercises.result.content[0].text;
      assert.ok(text.includes('ex7 | Squat (Barbell) | Barbell | Quads + Glutes | weight_reps'), text);
      assert.ok(!text.includes('ex1 |'), 'muscle filter applied');

      const format = await server.request('tools/call', { name: 'get_routine_format', arguments: {} });
      assert.ok(format.result.content[0].text.includes('plzTrainRoutine must be 1'), 'rules shown');
      assert.ok(format.result.content[0].text.includes('"exercises"'), 'example payload shown');

      const missing = await server.request('tools/call', { name: 'nope', arguments: {} });
      assert.equal(missing.result.isError, true, 'unknown tool is an error result');

      server.send('resources/list', {}, 999);
      const notFound = await server.next();
      assert.equal(notFound.error.code, -32601, 'unknown method gets -32601');
      assert.deepEqual(server.errors, [], 'nothing written to stderr');
    } finally {
      server.close();
    }
  });
});

describe('P4-11 MCP server: create_routine', () => {
  it('mcp-create-routine-returns-valid-link', async () => {
    const server = startServer();
    try {
      await server.request('initialize', { protocolVersion: '2024-11-05' });
      const args = {
        name: 'AI Legs',
        exercises: [
          { exId: 'ex7', sets: 4, reps: '5' },
          { exId: 'ex8', sets: 3, reps: '8-10', restSec: 120, note: 'Slow down' }
        ]
      };
      const reply = await server.request('tools/call', { name: 'create_routine', arguments: args });
      assert.ok(!reply.result.isError, 'valid routine accepted');
      const text = reply.result.content[0].text;
      assert.ok(text.includes('Routine "AI Legs" is ready.'), text);

      const link = /https:\/\/\S+#import-routine=[A-Za-z0-9_-]+/.exec(text);
      assert.ok(link, 'import link present: ' + text);
      assert.ok(link[0].startsWith(APP_URL + '/#' + ROUTINE_HASH_KEY + '='), 'link uses the app URL and hash key');

      const decoded = decodeRoutineLink(link[0]);
      const check = validateRoutinePayload(decoded, catalogueIds());
      assert.equal(check.ok, true, 'decoded link re-validates');
      assert.equal(decoded.name, 'AI Legs');
      assert.deepEqual(decoded.exercises.map((e) => e.exId), ['ex7', 'ex8']);
      assert.equal(decoded.exercises[1].restSec, 120, 'rest survives the link');
      assert.equal(decoded.exercises[1].note, 'Slow down', 'note survives the link');
      assert.ok(text.includes('"plzTrainRoutine": 1'), 'pretty routine JSON included');

      const bad = await server.request('tools/call', {
        name: 'create_routine',
        arguments: { name: 'Bad', exercises: [{ exId: 'ex999', sets: 25, reps: 8 }] }
      });
      assert.equal(bad.result.isError, true, 'invalid routine rejected');
      const badText = bad.result.content[0].text;
      assert.ok(badText.includes('Routine rejected; nothing was created.'), badText);
      assert.ok(badText.includes('exercises[0].exId must be one of the built-in exercise ids (got ex999)'), badText);
      assert.ok(badText.includes('exercises[0].sets must be a whole number 1–10 (got 25)'), badText);
      assert.ok(badText.includes('exercises[0].reps must be a string like "8" or "8-12" (got 8)'), badText);
      assert.ok(!badText.includes('import-routine='), 'no link when invalid');
      assert.deepEqual(server.errors, [], 'no stderr noise');
    } finally {
      server.close();
    }
  });
});
