import type { Context } from 'hono';

/** Application-level error with HTTP status. */
export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly code: string = 'error',
    ) {
        super(message);
    }

    static badRequest(msg: string, code = 'bad_request') {
        return new ApiError(400, msg, code);
    }
    static unauthorized(msg = 'Authentication required') {
        return new ApiError(401, msg, 'unauthorized');
    }
    static forbidden(msg = 'You do not have access to this resource') {
        return new ApiError(403, msg, 'forbidden');
    }
    static notFound(msg = 'Resource not found') {
        return new ApiError(404, msg, 'not_found');
    }
    static conflict(msg: string, code = 'conflict') {
        return new ApiError(409, msg, code);
    }
    static tooMany(msg = 'Too many requests, please slow down') {
        return new ApiError(429, msg, 'rate_limited');
    }
}

export const ok = (c: Context, data: unknown, init?: { status?: number; headers?: Record<string, string> }) =>
    c.json({ success: true, data }, (init?.status ?? 200) as never, init?.headers);

/**
 * Fixed, generic message to avoid account enumeration on login.
 */
export const INVALID_CREDENTIALS = 'Incorrect email or password';

/* ------------------------------- CORS ------------------------------- */

export function isPreflight(request: Request): boolean {
    return request.method === 'OPTIONS';
}

export function corsHeaders(request: Request, allowed: string[]): Record<string, string> {
    const origin = request.headers.get('Origin') || '';
    const allow =
        origin && allowed.includes(origin) ? origin : allowed[0] || '*';
    const headers: Record<string, string> = {
        'Access-Control-Allow-Origin': allow,
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
        'Access-Control-Max-Age': '86400',
    };
    if (origin && allowed.includes(origin)) {
        headers['Access-Control-Allow-Credentials'] = 'true';
    }
    return headers;
}

/* --------------------------- security headers --------------------------- */

export function securityHeaders(): Record<string, string> {
    return {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store',
        'X-Frame-Options': 'DENY',
        'Permissions-Policy': 'camera=(self), geolocation=(), microphone=()',
    };
}

/* ---------------------------- rate limiting ---------------------------- */

export interface RateLimitResult {
    ok: boolean;
    retryAfterSec: number;
}

/**
 * Fixed-window rate limiter backed by KV.
 * `key` should be a stable per-actor identifier (e.g. ip+action).
 */
export async function rateLimit(
    kv: KVNamespace,
    key: string,
    limit: number,
    windowSec: number,
): Promise<RateLimitResult> {
    const prefix = `rl:${key}:${windowSec}`;
    const current = (await kv.get(prefix)) ? parseInt((await kv.get(prefix)) as string, 10) : 0;
    if (current >= limit) {
        // Rough retry-after: assume window restarts from when the key was created.
        return { ok: false, retryAfterSec: Math.ceil(windowSec / 2) };
    }
    // Best-effort atomic-ish increment (KV get+put race is acceptable for rate limiting).
    await kv.put(prefix, String(current + 1), { expirationTtl: windowSec });
    return { ok: true, retryAfterSec: 0 };
}

/* ------------------------------ body limit ------------------------------ */

export async function readBodyWithLimit(
    request: Request,
    maxBytes: number,
): Promise<ArrayBuffer> {
    const declared = request.headers.get('Content-Length');
    if (declared) {
        const len = parseInt(declared, 10);
        if (Number.isFinite(len) && len > maxBytes) {
            throw new ApiError(413, `Payload too large (max ${Math.round(maxBytes / 1024)}KB)`);
        }
    }
    const buf = await request.arrayBuffer();
    if (buf.byteLength > maxBytes) {
        throw new ApiError(413, `Payload too large (max ${Math.round(maxBytes / 1024)}KB)`);
    }
    return buf;
}
