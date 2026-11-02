// api/sync.js — Synchronize app state between phone and cloud.
// Authenticated via sha256(token) matching owner_hash.

import {
  hashToken,
  getOwnerRow,
  saveStateWithHistory,
  undoLastVersion,
  sanitizeStateForSync
} from './_supabase.js';
import { setCors, handlePreflight, sendJson, readJsonBody, bearerToken } from './_http.js';

export default async function handler(req, res) {
  setCors(res, 'GET, POST, OPTIONS', 'Content-Type, Authorization');
  if (handlePreflight(req, res)) return;

  // Header only: a token in the URL would end up in request logs.
  const ownerHash = hashToken(bearerToken(req));
  if (!ownerHash) {
    sendJson(res, 401, { error: 'Unauthorized: missing connector token' });
    return;
  }

  try {
    const owner = await getOwnerRow(ownerHash);
    if (!owner) {
      sendJson(res, 401, { error: 'Unauthorized: unknown or revoked token' });
      return;
    }

    if (req.method === 'GET') {
      const isUndo = (req.query && (req.query.undo === '1' || req.query.undo === 'true')) ||
        (req.url && req.url.includes('undo=1'));

      if (isUndo) {
        const undone = await undoLastVersion(ownerHash, owner);
        if (!undone) {
          sendJson(res, 400, { error: 'No previous version available to undo' });
          return;
        }
        sendJson(res, 200, { ok: true, state: undone.state, rev: undone.rev, updated_by: 'app-undo' });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        state: owner.state,
        rev: Number(owner.rev || 0),
        updated_at: owner.updated_at,
        updated_by: owner.updated_by,
        summary: owner.summary || ''
      });
      return;
    }

    if (req.method === 'POST') {
      const parsed = readJsonBody(req);
      if (!parsed.ok) {
        sendJson(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      const body = parsed.body;

      const serverRev = Number(owner.rev || 0);
      const clientRev = Number(body.clientRev !== undefined ? body.clientRev : (body.rev !== undefined ? body.rev : 0));
      const baseRev = Number(body.baseRev !== undefined ? body.baseRev : clientRev);

      // Conflict detection: server advanced ahead of client's base knowledge
      if (serverRev > baseRev && owner.updated_by !== 'app') {
        sendJson(res, 409, {
          ok: false,
          conflict: true,
          serverRev: serverRev,
          serverState: owner.state,
          updated_by: owner.updated_by,
          summary: owner.summary || ''
        });
        return;
      }

      const clean = sanitizeStateForSync(body.state || {});
      const newRev = Math.max(serverRev, clientRev) + 1;
      const summary = typeof body.summary === 'string' ? body.summary : 'Synced from app';

      await saveStateWithHistory(ownerHash, clean, newRev, 'app', summary, owner);
      sendJson(res, 200, { ok: true, rev: newRev });
      return;
    }

    sendJson(res, 405, { error: 'Method Not Allowed' });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
}
