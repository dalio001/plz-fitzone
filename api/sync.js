// api/sync.js — Synchronize app state between phone and cloud.
// Authenticated via sha256(token) matching owner_hash.

import {
  hashToken,
  getOwnerRow,
  saveStateWithHistory,
  undoLastVersion,
  sanitizeStateForSync
} from './_supabase.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-plz-token');
}

function extractToken(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const custom = req.headers['x-plz-token'] || '';
  if (custom) return String(custom).trim();
  if (req.query && req.query.token) return String(req.query.token).trim();
  try {
    const url = new URL(req.url, 'http://localhost');
    const t = url.searchParams.get('token');
    if (t) return t.trim();
  } catch (e) {}
  return '';
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const token = extractToken(req);
  const ownerHash = hashToken(token);
  if (!ownerHash) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized: missing connector token' }));
    return;
  }

  try {
    const owner = await getOwnerRow(ownerHash);
    if (!owner) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unauthorized: unknown or revoked token' }));
      return;
    }

    if (req.method === 'GET') {
      const isUndo = (req.query && (req.query.undo === '1' || req.query.undo === 'true')) ||
        (req.url && req.url.includes('undo=1'));

      if (isUndo) {
        const undone = await undoLastVersion(ownerHash);
        if (!undone) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'No previous version available to undo' }));
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, state: undone.state, rev: undone.rev, updated_by: 'app-undo' }));
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        ok: true,
        state: owner.state,
        rev: Number(owner.rev || 0),
        updated_at: owner.updated_at,
        updated_by: owner.updated_by,
        summary: owner.summary || ''
      }));
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }
      }
      body = body || {};

      const serverRev = Number(owner.rev || 0);
      const clientRev = Number(body.clientRev !== undefined ? body.clientRev : (body.rev !== undefined ? body.rev : 0));
      const baseRev = Number(body.baseRev !== undefined ? body.baseRev : clientRev);

      // Conflict detection: server advanced ahead of client's base knowledge
      if (serverRev > baseRev && owner.updated_by !== 'app') {
        res.statusCode = 409;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          ok: false,
          conflict: true,
          serverRev: serverRev,
          serverState: owner.state,
          updated_by: owner.updated_by,
          summary: owner.summary || ''
        }));
        return;
      }

      const clean = sanitizeStateForSync(body.state || {});
      const newRev = Math.max(serverRev, clientRev) + 1;
      const summary = typeof body.summary === 'string' ? body.summary : 'Synced from app';

      await saveStateWithHistory(ownerHash, clean, newRev, 'app', summary);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, rev: newRev }));
      return;
    }

    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
  }
}
