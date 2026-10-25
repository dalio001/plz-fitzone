// api/_supabase.js — Supabase PostgREST helper, rate-limiting & sha256 hashing.
// Built-in Node modules only, zero npm dependencies.

import crypto from 'node:crypto';

// In-memory rate limiting: token -> array of timestamps
const rateLimitBuckets = new Map();

export function hashToken(token) {
  if (typeof token !== 'string' || !token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function checkRateLimit(key, maxRequests = 60, windowMs = 60000) {
  const now = Date.now();
  let timestamps = rateLimitBuckets.get(key) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateLimitBuckets.set(key, timestamps);
    return { allowed: false, retryAfter };
  }
  timestamps.push(now);
  rateLimitBuckets.set(key, timestamps);
  return { allowed: true, retryAfter: 0 };
}

export function resetRateLimits() {
  rateLimitBuckets.clear();
}

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/\/+$/, '') : '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, key };
}

export async function supabaseFetch(endpoint, options = {}) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    throw new Error('Supabase environment variables not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
  }

  const reqUrl = `${url}/rest/v1${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = Object.assign({
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }, options.headers || {});

  const res = await fetch(reqUrl, Object.assign({}, options, { headers }));
  return res;
}

export async function getOwnerRow(ownerHash) {
  if (!ownerHash) return null;
  const res = await supabaseFetch(`/plz_state?owner_hash=eq.${encodeURIComponent(ownerHash)}&select=*`);
  if (!res.ok) {
    throw new Error(`Supabase query failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function hasAnyOwner() {
  const res = await supabaseFetch('/plz_state?select=owner_hash&limit=1');
  if (!res.ok) {
    throw new Error(`Supabase query failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

export async function createOwner(ownerHash, initialState = {}, rev = 0, updatedBy = 'pair', summary = 'Paired') {
  const body = {
    owner_hash: ownerHash,
    state: initialState || {},
    rev: Number(rev) || 0,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy || 'pair',
    summary: summary || ''
  };
  const res = await supabaseFetch('/plz_state', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create owner: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function resetOwner(oldOwnerHash, newOwnerHash) {
  // Update owner_hash on plz_state
  const res = await supabaseFetch(`/plz_state?owner_hash=eq.${encodeURIComponent(oldOwnerHash)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      owner_hash: newOwnerHash,
      updated_at: new Date().toISOString(),
      updated_by: 'reset',
      summary: 'Owner token reset'
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to reset owner: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteOwner(ownerHash) {
  const res = await supabaseFetch(`/plz_state?owner_hash=eq.${encodeURIComponent(ownerHash)}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=representation' }
  });
  return res.ok;
}

export async function saveStateWithHistory(ownerHash, newState, newRev, updatedBy, summary) {
  const current = await getOwnerRow(ownerHash);
  if (!current) throw new Error('Owner not found');

  // 1. Insert history snapshot if rev > 0
  if (current.rev !== undefined && current.state) {
    try {
      await supabaseFetch('/plz_state_history', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          owner_hash: ownerHash,
          rev: current.rev,
          state: current.state,
          updated_at: current.updated_at || new Date().toISOString(),
          updated_by: current.updated_by || 'app',
          summary: current.summary || ''
        })
      });
    } catch (e) {
      // History insert failure should not completely abort state save
    }
  }

  // 2. Update plz_state
  const res = await supabaseFetch(`/plz_state?owner_hash=eq.${encodeURIComponent(ownerHash)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      state: newState,
      rev: newRev,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
      summary: summary || ''
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to save state: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function undoLastVersion(ownerHash) {
  // Query newest history version
  const res = await supabaseFetch(`/plz_state_history?owner_hash=eq.${encodeURIComponent(ownerHash)}&order=rev.desc&limit=1`);
  if (!res.ok) throw new Error('Failed to query history');
  const items = await res.json();
  if (!Array.isArray(items) || items.length === 0) return null;

  const previous = items[0];
  const current = await getOwnerRow(ownerHash);
  const nextRev = (current ? Number(current.rev || 0) : 0) + 1;

  // Restore state to previous version
  const updateRes = await supabaseFetch(`/plz_state?owner_hash=eq.${encodeURIComponent(ownerHash)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      state: previous.state,
      rev: nextRev,
      updated_at: new Date().toISOString(),
      updated_by: 'app-undo',
      summary: `Undo to rev ${previous.rev}`
    })
  });

  if (!updateRes.ok) throw new Error('Failed to restore state');

  // Delete that history row so subsequent undos walk backwards
  if (previous.id) {
    await supabaseFetch(`/plz_state_history?id=eq.${previous.id}`, { method: 'DELETE' });
  }

  return { state: previous.state, rev: nextRev };
}

// Strip sensitive or non-portable keys before saving
export function sanitizeStateForSync(state) {
  if (!state || typeof state !== 'object') return {};
  const clean = Object.assign({}, state);
  delete clean.photos; // Photos NEVER leave the phone
  delete clean.aiToken;
  return clean;
}
