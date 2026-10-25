// api/pair.js — One-time pairing and token reset.
// Once an owner exists, pairing is closed; reset only with the current token.

import {
  hashToken,
  hasAnyOwner,
  getOwnerRow,
  createOwner,
  resetOwner,
  deleteOwner,
  sanitizeStateForSync
} from './_supabase.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST.' }));
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
      return;
    }
  }
  body = body || {};

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const tokenHash = typeof body.tokenHash === 'string' ? body.tokenHash.trim() : '';
  const newHash = tokenHash || hashToken(token);

  const oldToken = typeof body.oldToken === 'string' ? body.oldToken.trim() : '';
  const oldTokenHash = typeof body.oldTokenHash === 'string' ? body.oldTokenHash.trim() : '';
  const oldHash = oldTokenHash || hashToken(oldToken);

  const action = body.action || 'pair';

  try {
    const ownerExists = await hasAnyOwner();

    // Disconnect action
    if (action === 'disconnect') {
      if (!oldHash) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Disconnect requires the current token.' }));
        return;
      }
      const existing = await getOwnerRow(oldHash);
      if (!existing) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid token for disconnect.' }));
        return;
      }
      await deleteOwner(oldHash);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, message: 'Disconnected successfully.' }));
      return;
    }

    if (!newHash) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing new token or tokenHash.' }));
      return;
    }

    if (!ownerExists) {
      // First-time pairing
      const initialState = sanitizeStateForSync(body.state || {});
      const rev = Number(body.rev || 0);
      await createOwner(newHash, initialState, rev, 'pair', 'Paired');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, message: 'Paired successfully.' }));
      return;
    }

    // Owner already exists: pairing is closed unless valid old token is provided
    if (!oldHash) {
      res.statusCode = 409;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Pairing closed: an owner is already registered. To change or reset your token, provide the current token.'
      }));
      return;
    }

    const currentOwner = await getOwnerRow(oldHash);
    if (!currentOwner) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid current token. Token reset refused.' }));
      return;
    }

    await resetOwner(oldHash, newHash);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, message: 'Owner token reset successfully.' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
  }
}
