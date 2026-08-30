// HTTP helpers — response envelopes and CORS for the Akawo API.

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function corsHeaders(request, env) {
  const configured = (env && env.CORS_ORIGIN) || '*';
  const origin = request.headers.get('Origin') || '';
  let allowOrigin = configured;
  if (configured !== '*' && configured.split(',').map((s) => s.trim()).includes(origin)) {
    allowOrigin = origin;
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function ok(data) {
  return json({ success: true, data });
}

export function okList(data, count) {
  return json({ success: true, count, data });
}

export function fail(message, status = 400) {
  return json({ success: false, error: message }, status);
}

// Safely parse a JSON request body.
export async function readJson(request) {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch (e) {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

export function notFound() {
  return fail('Resource not found', 404);
}
