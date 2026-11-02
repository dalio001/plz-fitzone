// api/pair.js — One-time pairing and disconnect.
// Once an owner exists, pairing is closed until that owner disconnects.

import {
  hashToken,
  hasAnyOwner,
  getOwnerRow,
  createOwner,
  deleteOwner,
  sanitizeStateForSync
} from './_supabase.js';
import { setCors, handlePreflight, sendJson, readJsonBody } from './_http.js';

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS', 'Content-Type, Authorization');
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const parsed = readJsonBody(req);
  if (!parsed.ok) {
    sendJson(res, 400, { error: 'Invalid JSON body.' });
    return;
  }
  const body = parsed.body;

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const tokenHash = typeof body.tokenHash === 'string' ? body.tokenHash.trim() : '';
  const newHash = tokenHash || hashToken(token);

  const oldToken = typeof body.oldToken === 'string' ? body.oldToken.trim() : '';
  const oldTokenHash = typeof body.oldTokenHash === 'string' ? body.oldTokenHash.trim() : '';
  const oldHash = oldTokenHash || hashToken(oldToken);

  const action = body.action || 'pair';

  try {
    if (action === 'disconnect') {
      if (!oldHash) {
        sendJson(res, 401, { error: 'Disconnect requires the current token.' });
        return;
      }
      const existing = await getOwnerRow(oldHash);
      if (!existing) {
        sendJson(res, 403, { error: 'Invalid token for disconnect.' });
        return;
      }
      await deleteOwner(oldHash);
      sendJson(res, 200, { ok: true, message: 'Disconnected successfully.' });
      return;
    }

    if (!newHash) {
      sendJson(res, 400, { error: 'Missing new token or tokenHash.' });
      return;
    }

    // Asked only here: disconnect never needs it.
    if (await hasAnyOwner()) {
      // No token swap: the app never offered one. Disconnect, then pair again.
      sendJson(res, 409, {
        error: 'Pairing closed: an AI connection already exists. Disconnect it on the paired phone first.'
      });
      return;
    }

    const initialState = sanitizeStateForSync(body.state || {});
    const rev = Number(body.rev || 0);
    await createOwner(newHash, initialState, rev, 'pair', 'Paired');
    sendJson(res, 200, { ok: true, message: 'Paired successfully.' });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
}
