// api/_http.js — Shared request/reply plumbing for the API endpoints.
// Files starting with "_" are not endpoints on Vercel.

export function setCors(res, methods, allowHeaders, maxAgeSec) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', allowHeaders);
  if (maxAgeSec) res.setHeader('Access-Control-Max-Age', String(maxAgeSec));
}

// Answer a CORS preflight. Returns true when the request was handled.
export function handlePreflight(req, res) {
  if (req.method !== 'OPTIONS') return false;
  res.statusCode = 204;
  res.end();
  return true;
}

export function sendJson(res, status, payload, headers) {
  res.statusCode = status;
  if (headers) Object.keys(headers).forEach(k => res.setHeader(k, headers[k]));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

// Vercel gives an object for JSON requests and a string otherwise.
// Returns { ok: true, body } or { ok: false } for a body that is not JSON.
export function readJsonBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return { ok: false };
    }
  }
  return { ok: true, body: body || {} };
}

// The app sends its connector token only as "Authorization: Bearer <token>".
export function bearerToken(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}
