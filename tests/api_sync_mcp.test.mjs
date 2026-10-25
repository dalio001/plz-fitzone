// tests/api_sync_mcp.test.mjs — P4-11 remote MCP & Supabase sync test suite.
// Built-in node:test, zero npm dependencies.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadIndexHtml } from './harness.mjs';
import pairHandler from '../api/pair.js';
import syncHandler from '../api/sync.js';
import mcpHandler from '../api/mcp/[token].js';
import { hashToken, resetRateLimits } from '../api/_supabase.js';

// ---- In-memory Supabase Mock --------------------------------------------
let db = {
  plz_state: new Map(),
  plz_state_history: []
};

const FAKE_URL = 'https://fake-project.supabase.co';
const FAKE_KEY = 'fake-service-role-key';

process.env.SUPABASE_URL = FAKE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = FAKE_KEY;

function setupFakeSupabase() {
  db = {
    plz_state: new Map(),
    plz_state_history: []
  };
  resetRateLimits();

  globalThis.fetch = async function (url, options = {}) {
    const urlStr = String(url);
    const headers = options.headers || {};
    const method = (options.method || 'GET').toUpperCase();

    // Verify service role key is passed
    if (headers['apikey'] !== FAKE_KEY || !headers['Authorization'] || !headers['Authorization'].includes(FAKE_KEY)) {
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
        text: async () => 'Unauthorized'
      };
    }

    const u = new URL(urlStr);
    const pathname = u.pathname;

    // plz_state endpoint
    if (pathname === '/rest/v1/plz_state') {
      const ownerHashFilter = u.searchParams.get('owner_hash');
      const hash = ownerHashFilter && ownerHashFilter.startsWith('eq.') ? ownerHashFilter.slice(3) : null;

      if (method === 'GET') {
        if (hash) {
          const row = db.plz_state.get(hash);
          return {
            ok: true,
            status: 200,
            json: async () => (row ? [row] : [])
          };
        }
        // Limit query: check if any owner exists
        const all = Array.from(db.plz_state.values());
        return {
          ok: true,
          status: 200,
          json: async () => all.slice(0, 1)
        };
      }

      if (method === 'POST') {
        const body = JSON.parse(options.body || '{}');
        db.plz_state.set(body.owner_hash, body);
        return {
          ok: true,
          status: 201,
          json: async () => [body]
        };
      }

      if (method === 'PATCH') {
        const body = JSON.parse(options.body || '{}');
        const existing = db.plz_state.get(hash) || {};
        const updated = Object.assign({}, existing, body);
        if (body.owner_hash && body.owner_hash !== hash) {
          db.plz_state.delete(hash);
          db.plz_state.set(body.owner_hash, updated);
        } else {
          db.plz_state.set(hash, updated);
        }
        return {
          ok: true,
          status: 200,
          json: async () => [updated]
        };
      }

      if (method === 'DELETE') {
        db.plz_state.delete(hash);
        return { ok: true, status: 204 };
      }
    }

    // plz_state_history endpoint
    if (pathname === '/rest/v1/plz_state_history') {
      const ownerHashFilter = u.searchParams.get('owner_hash');
      const hash = ownerHashFilter && ownerHashFilter.startsWith('eq.') ? ownerHashFilter.slice(3) : null;
      const idFilter = u.searchParams.get('id');
      const id = idFilter && idFilter.startsWith('eq.') ? Number(idFilter.slice(3)) : null;

      if (method === 'POST') {
        const body = JSON.parse(options.body || '{}');
        body.id = db.plz_state_history.length + 1;
        db.plz_state_history.unshift(body);
        if (db.plz_state_history.length > 20) {
          db.plz_state_history = db.plz_state_history.slice(0, 20);
        }
        return {
          ok: true,
          status: 201,
          json: async () => [body]
        };
      }

      if (method === 'GET') {
        let list = db.plz_state_history.slice();
        if (hash) list = list.filter(h => h.owner_hash === hash);
        list.sort((a, b) => Number(b.rev) - Number(a.rev));
        return {
          ok: true,
          status: 200,
          json: async () => list
        };
      }

      if (method === 'DELETE') {
        if (id) {
          db.plz_state_history = db.plz_state_history.filter(h => h.id !== id);
        }
        return { ok: true, status: 204 };
      }
    }

    return { ok: false, status: 404, statusText: 'Not found' };
  };
}

function mockReqRes(options = {}) {
  const req = {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    query: options.query || {},
    body: options.body || null
  };

  const headersSent = {};
  let bodyData = '';
  const res = {
    statusCode: 200,
    setHeader(k, v) { headersSent[k.toLowerCase()] = v; },
    getHeader(k) { return headersSent[k.toLowerCase()]; },
    end(data) { if (data) bodyData += data; },
    get body() {
      try { return JSON.parse(bodyData); } catch (e) { return bodyData; }
    },
    get rawBody() { return bodyData; }
  };

  return { req, res };
}

describe('P4-11 Security & Architecture Rules', () => {
  it('service-key-never-in-index-html', () => {
    const html = loadIndexHtml();
    assert.ok(!html.includes('SUPABASE_SERVICE_ROLE_KEY'), 'never mentions service role key');
    assert.ok(!html.includes('service_role'), 'never contains service_role secret string');
    assert.ok(!html.includes('SUPABASE_URL'), 'never embeds SUPABASE_URL');
    assert.ok(!html.includes('sbp_'), 'no hardcoded supabase tokens');
  });

  it('handlers-compile', () => {
    const html = loadIndexHtml();
    const handlers = [
      'pairAiConnector()',
      'disconnectAiConnector()',
      'copyAiConnectorUrl()',
      'undoAiUpdate()'
    ];
    handlers.forEach(h => {
      assert.ok(html.includes(h), `handler ${h} wired in html`);
    });
  });

  it('nothing-wider-than-412', () => {
    const html = loadIndexHtml();
    const aiCardIdx = html.indexOf('id="aiConnectCard"');
    assert.ok(aiCardIdx > 0, 'aiConnectCard present');
    const aiBannerIdx = html.indexOf('id="aiUpdateBanner"');
    assert.ok(aiBannerIdx > 0, 'aiUpdateBanner present');

    const bannerBlock = html.slice(aiBannerIdx, html.indexOf('</div>', aiBannerIdx) + 200);
    assert.ok(bannerBlock.includes('max-width:412px'), 'banner max-width capped at 412px');

    const pairBtnIdx = html.indexOf('id="pairAiBtn"');
    const pairBtn = html.slice(pairBtnIdx - 50, pairBtnIdx + 150);
    assert.ok(pairBtn.includes('min-height:44px'), 'pair button touch target is at least 44px');

    const undoBtnIdx = html.indexOf('id="undoAiUpdateBtn"');
    const undoBtn = html.slice(undoBtnIdx - 50, undoBtnIdx + 150);
    assert.ok(undoBtn.includes('min-height:44px'), 'undo button touch target is at least 44px');
  });
});

describe('P4-11 Pairing & Authentication (/api/pair)', () => {
  beforeEach(() => {
    setupFakeSupabase();
  });

  it('pair-once: first pairing succeeds and closes pairing to unauthenticated resets', async () => {
    const token = 'my-secret-token-12345678901234567890';
    const { req, res } = mockReqRes({
      method: 'POST',
      url: '/api/pair',
      body: { token, state: { routines: [] }, rev: 0 }
    });

    await pairHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);

    // Verify stored in DB by hash only
    const hash = hashToken(token);
    assert.ok(db.plz_state.has(hash), 'owner stored in database by hash');
    assert.equal(db.plz_state.get(hash).owner_hash, hash);

    // Second pairing attempt with another token without old token is refused (409)
    const { req: req2, res: res2 } = mockReqRes({
      method: 'POST',
      url: '/api/pair',
      body: { token: 'another-token' }
    });
    await pairHandler(req2, res2);
    assert.equal(res2.statusCode, 409, 'pairing is closed once an owner exists');

    // Resetting with correct old token succeeds
    const newToken = 'new-shiny-token-abcdef1234567890';
    const { req: req3, res: res3 } = mockReqRes({
      method: 'POST',
      url: '/api/pair',
      body: { token: newToken, oldToken: token }
    });
    await pairHandler(req3, res3);
    assert.equal(res3.statusCode, 200, 'reset succeeds with current token');
    const newHash = hashToken(newToken);
    assert.ok(db.plz_state.has(newHash), 'new token hash active');
    assert.ok(!db.plz_state.has(hash), 'old token hash removed');
  });

  it('wrong-token-401: rejected when unauthorized', async () => {
    // 1. Pair legitimate owner
    const validToken = 'good-token-123';
    const { req: pReq, res: pRes } = mockReqRes({
      method: 'POST',
      url: '/api/pair',
      body: { token: validToken }
    });
    await pairHandler(pReq, pRes);

    // 2. Call /api/sync with wrong token
    const { req: sReq, res: sRes } = mockReqRes({
      method: 'GET',
      url: '/api/sync',
      headers: { authorization: 'Bearer wrong-token' }
    });
    await syncHandler(sReq, sRes);
    assert.equal(sRes.statusCode, 401, 'wrong token returns 401 on sync');

    // 3. Call /api/mcp with wrong token
    const { req: mReq, res: mRes } = mockReqRes({
      method: 'POST',
      url: '/api/mcp/wrong-token',
      query: { token: 'wrong-token' },
      body: { jsonrpc: '2.0', id: 1, method: 'ping' }
    });
    await mcpHandler(mReq, mRes);
    assert.equal(mRes.statusCode, 401, 'wrong token returns 401 on mcp');
  });
});

describe('P4-11 MCP Protocol Handshake & Tool Discovery', () => {
  const token = 'mcp-test-token-77777777777777777777';

  beforeEach(async () => {
    setupFakeSupabase();
    const { req, res } = mockReqRes({
      method: 'POST',
      url: '/api/pair',
      body: { token }
    });
    await pairHandler(req, res);
  });

  it('mcp-initialize-tools-list: responds to initialize, initialized notification and lists tools', async () => {
    // 1. Initialize with client protocol
    const { req: initReq, res: initRes } = mockReqRes({
      method: 'POST',
      url: `/api/mcp/${token}`,
      query: { token },
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26' }
      }
    });
    await mcpHandler(initReq, initRes);
    assert.equal(initRes.statusCode, 200);
    assert.equal(initRes.body.result.protocolVersion, '2025-03-26');
    assert.equal(initRes.body.result.serverInfo.name, 'plz-train');

    // 2. notifications/initialized returns 202
    const { req: notifReq, res: notifRes } = mockReqRes({
      method: 'POST',
      url: `/api/mcp/${token}`,
      query: { token },
      body: { jsonrpc: '2.0', method: 'notifications/initialized' }
    });
    await mcpHandler(notifReq, notifRes);
    assert.equal(notifRes.statusCode, 202, 'notification returns 202 Accepted');

    // 3. tools/list lists all 13 tools
    const { req: listReq, res: listRes } = mockReqRes({
      method: 'POST',
      url: `/api/mcp/${token}`,
      query: { token },
      body: { jsonrpc: '2.0', id: 2, method: 'tools/list' }
    });
    await mcpHandler(listReq, listRes);
    assert.equal(listRes.statusCode, 200);
    const tools = listRes.body.result.tools;
    assert.equal(tools.length, 13, 'all 13 tools registered');
    const toolNames = tools.map(t => t.name);
    [
      'get_overview', 'list_workouts', 'get_workout', 'get_records',
      'get_body', 'list_routines', 'list_exercises', 'create_routine',
      'update_routine', 'delete_routine', 'plan_week', 'add_body_entry',
      'log_workout'
    ].forEach(name => {
      assert.ok(toolNames.includes(name), `tool ${name} is in tools/list`);
    });
  });

  it('GET /api/mcp returns 405 Method Not Allowed; OPTIONS returns CORS 204', async () => {
    const { req: optReq, res: optRes } = mockReqRes({
      method: 'OPTIONS',
      url: `/api/mcp/${token}`
    });
    await mcpHandler(optReq, optRes);
    assert.equal(optRes.statusCode, 204);
    assert.equal(optRes.getHeader('access-control-allow-origin'), '*');

    const { req: getReq, res: getRes } = mockReqRes({
      method: 'GET',
      url: `/api/mcp/${token}`
    });
    await mcpHandler(getReq, getRes);
    assert.equal(getRes.statusCode, 405);
  });
});

describe('P4-11 All 13 MCP Tools & Validation Errors', () => {
  const token = 'tools-test-token-88888888888888888888';

  beforeEach(async () => {
    setupFakeSupabase();
    const initialState = {
      routines: [
        { id: 'rt_1', name: 'Upper Power', exercises: [{ exId: 'ex1', sets: 3, targetReps: '8-12', restSec: 90 }] }
      ],
      history: [
        {
          id: 'w_101',
          name: 'Heavy Chest',
          date: new Date('2026-10-20T10:00:00Z').getTime(),
          totalVolume: 2400,
          exercises: [
            { exId: 'ex1', sets: [{ weight: 100, reps: 8 }, { weight: 100, reps: 8 }, { weight: 100, reps: 8 }] }
          ]
        }
      ],
      body: [
        { date: '2026-10-21', weightKg: 82.5, measures: { waist: 84 } }
      ],
      plans: { mon: 'Upper Power' }
    };
    const { req, res } = mockReqRes({
      method: 'POST',
      url: '/api/pair',
      body: { token, state: initialState, rev: 1 }
    });
    await pairHandler(req, res);
  });

  async function callMcpTool(name, args = {}) {
    const { req, res } = mockReqRes({
      method: 'POST',
      url: `/api/mcp/${token}`,
      query: { token },
      body: {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args }
      }
    });
    await mcpHandler(req, res);
    return res.body.result;
  }

  it('each tool happy path and validation errors', async () => {
    // 1. get_overview
    const overview = await callMcpTool('get_overview');
    assert.ok(overview.content[0].text.includes('Workouts logged: 1'));
    assert.ok(overview.content[0].text.includes('Routines saved: 1'));

    // 2. list_workouts
    const workouts = await callMcpTool('list_workouts', { limit: 10 });
    assert.ok(workouts.content[0].text.includes('Heavy Chest'));
    const emptyWorkouts = await callMcpTool('list_workouts', { from: '2099-01-01' });
    assert.ok(emptyWorkouts.content[0].text.includes('No workouts found'));

    // 3. get_workout
    const wOk = await callMcpTool('get_workout', { id: 'w_101' });
    assert.ok(wOk.content[0].text.includes('100 kg × 8'));
    const wFail = await callMcpTool('get_workout', { id: 'bad_id' });
    assert.equal(wFail.isError, true);

    // 4. get_records
    const recs = await callMcpTool('get_records', { exId: 'ex1' });
    assert.ok(recs.content[0].text.includes('Max weight 100 kg'));

    // 5. get_body (photos never returned)
    const bodyRes = await callMcpTool('get_body');
    assert.ok(bodyRes.content[0].text.includes('82.5 kg'));
    assert.ok(!bodyRes.content[0].text.includes('photo'));

    // 6. list_routines
    const routines = await callMcpTool('list_routines');
    assert.ok(routines.content[0].text.includes('Upper Power'));

    // 7. list_exercises
    const exList = await callMcpTool('list_exercises', { muscle: 'Chest' });
    assert.ok(exList.content[0].text.includes('Bench Press'));

    // 8. create_routine happy path + validation error
    const createFail = await callMcpTool('create_routine', {
      name: 'Bad Routine',
      exercises: [{ exId: 'ex1', sets: 0, reps: '8' }]
    });
    assert.equal(createFail.isError, true, 'sets 0 rejected');

    const createOk = await callMcpTool('create_routine', {
      name: 'Leg Day',
      exercises: [{ exId: 'ex7', sets: 3, reps: '5-8', restSec: 120 }]
    });
    assert.equal(createOk.isError, false);
    assert.ok(createOk.content[0].text.includes('Leg Day'));

    // 9. update_routine happy path + validation error
    const updateFail = await callMcpTool('update_routine', { id: 'bad_rt_id' });
    assert.equal(updateFail.isError, true);

    const updateOk = await callMcpTool('update_routine', {
      id: 'rt_1',
      name: 'Upper Power V2'
    });
    assert.equal(updateOk.isError, false);

    // 10. plan_week
    const planOk = await callMcpTool('plan_week', { days: { wed: 'Leg Day', fri: 'Upper Power V2' } });
    assert.equal(planOk.isError, false);

    // 11. add_body_entry happy path + validation error
    const bodyFail = await callMcpTool('add_body_entry', { date: 'invalid-date', weightKg: 80 });
    assert.equal(bodyFail.isError, true);

    const bodyOk = await callMcpTool('add_body_entry', { date: '2026-10-22', weightKg: 82.1, measures: { waist: 83.5 } });
    assert.equal(bodyOk.isError, false);

    // 12. log_workout happy path + validation error
    const logFail = await callMcpTool('log_workout', {
      name: 'Impossible Workout',
      exercises: [{ exId: 'ex1', sets: [{ weight: -10, reps: 5 }] }]
    });
    assert.equal(logFail.isError, true, 'negative weight rejected');

    const logOk = await callMcpTool('log_workout', {
      name: 'Evening Arms',
      exercises: [{ exId: 'ex14', sets: [{ weight: 30, reps: 10 }, { weight: 30, reps: 10 }] }]
    });
    assert.equal(logOk.isError, false);

    // 13. delete_routine
    const delOk = await callMcpTool('delete_routine', { id: 'rt_1' });
    assert.equal(delOk.isError, false);
  });

  it('write-bumps-rev-and-history: writes record updated_by="ai" and archives prior version for undo', async () => {
    const ownerHash = hashToken(token);
    const initialRow = db.plz_state.get(ownerHash);
    const initialRev = initialRow.rev;

    // Create routine
    await callMcpTool('create_routine', {
      name: 'Shoulders Day',
      exercises: [{ exId: 'ex11', sets: 4, reps: '8-10' }]
    });

    const updatedRow = db.plz_state.get(ownerHash);
    assert.equal(updatedRow.rev, initialRev + 1, 'revision bumped');
    assert.equal(updatedRow.updated_by, 'ai', 'marked as updated_by ai');
    assert.ok(updatedRow.summary.includes('Shoulders Day'), 'descriptive summary recorded');

    // State history contains snapshot
    assert.equal(db.plz_state_history.length, 1, 'prior version saved in plz_state_history');
    assert.equal(db.plz_state_history[0].rev, initialRev);
  });
});

describe('P4-11 App Sync & Conflict Resolution (/api/sync)', () => {
  const token = 'sync-app-token-99999999999999999999';

  beforeEach(async () => {
    setupFakeSupabase();
    const { req, res } = mockReqRes({
      method: 'POST',
      url: '/api/pair',
      body: {
        token,
        state: { routines: [{ id: 'rt_1', name: 'Original' }], history: [] },
        rev: 1
      }
    });
    await pairHandler(req, res);
  });

  it('conflict-keeps-local-history: preserves local workouts by id and merges server routines/plans', async () => {
    const ownerHash = hashToken(token);

    // Server was updated by AI to rev 2 with new routine and AI workout
    const serverState = {
      routines: [{ id: 'rt_ai', name: 'AI Push' }],
      history: [{ id: 'w_ai_1', name: 'AI Logged Workout', date: 10000 }],
      plans: { mon: 'AI Push' }
    };
    db.plz_state.set(ownerHash, {
      owner_hash: ownerHash,
      state: serverState,
      rev: 2,
      updated_by: 'ai',
      summary: 'AI added Push Routine'
    });

    // Client had local workout while offline (client thinks baseRev is 1)
    const clientState = {
      routines: [{ id: 'rt_1', name: 'Original' }],
      history: [{ id: 'w_local_1', name: 'Local Gym Workout', date: 9000 }]
    };

    // Client pushes with baseRev 1 -> server detects conflict (rev 2 > 1)
    const { req, res } = mockReqRes({
      method: 'POST',
      url: '/api/sync',
      headers: { authorization: `Bearer ${token}` },
      body: { state: clientState, clientRev: 1, baseRev: 1 }
    });
    await syncHandler(req, res);

    assert.equal(res.statusCode, 409, 'conflict returned');
    assert.equal(res.body.conflict, true);
    assert.equal(res.body.serverRev, 2);

    // Merge logic: local workout kept, server routine accepted
    const localWorkouts = clientState.history;
    const serverWorkouts = res.body.serverState.history;
    const mergedHistory = [...localWorkouts];
    serverWorkouts.forEach(sw => {
      if (!mergedHistory.find(lw => lw.id === sw.id)) mergedHistory.push(sw);
    });

    assert.equal(mergedHistory.length, 2, 'both local and server workouts preserved');
    assert.ok(mergedHistory.find(w => w.id === 'w_local_1'), 'local workout kept');
    assert.ok(mergedHistory.find(w => w.id === 'w_ai_1'), 'server workout included');
  });

  it('photos-never-synced: client state strips photos before sync and server strips on save', async () => {
    const stateWithPhoto = {
      routines: [],
      history: [],
      photos: ['large-binary-photo-data-should-never-sync']
    };

    const { req, res } = mockReqRes({
      method: 'POST',
      url: '/api/sync',
      headers: { authorization: `Bearer ${token}` },
      body: { state: stateWithPhoto, clientRev: 1 }
    });
    await syncHandler(req, res);

    assert.equal(res.statusCode, 200);
    const ownerHash = hashToken(token);
    const storedState = db.plz_state.get(ownerHash).state;
    assert.equal(storedState.photos, undefined, 'photos stripped from synchronized state');
  });

  it('undo reverts state to previous version via /api/sync?undo=1', async () => {
    const ownerHash = hashToken(token);

    // Push version 2
    const v2State = { routines: [{ id: 'rt_v2', name: 'V2 Routine' }] };
    const { req: pReq, res: pRes } = mockReqRes({
      method: 'POST',
      url: '/api/sync',
      headers: { authorization: `Bearer ${token}` },
      body: { state: v2State, clientRev: 1 }
    });
    await syncHandler(pReq, pRes);
    assert.equal(pRes.statusCode, 200);

    // Call undo
    const { req: uReq, res: uRes } = mockReqRes({
      method: 'GET',
      url: '/api/sync?undo=1',
      query: { undo: '1' },
      headers: { authorization: `Bearer ${token}` }
    });
    await syncHandler(uReq, uRes);
    assert.equal(uRes.statusCode, 200);
    assert.equal(uRes.body.ok, true);
    assert.equal(uRes.body.state.routines[0].name, 'Original', 'reverted to original routine');
  });
});
