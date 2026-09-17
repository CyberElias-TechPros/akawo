/**
 * WebCrypto-based security primitives (no Node dependencies — Workers native).
 *
 * - Passwords: PBKDF2-SHA256, 210k iterations (OWASP 2023 minimum).
 * - Tokens:    random 256-bit, base64url.
 * - JWT:       HS256 via crypto.subtle HMAC.
 * - One-way tokens (email/pwreset): stored as SHA-256 hashes only.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

const PBKDF2_ITERATIONS = 210_000;

const bytesToB64url = (buf: ArrayBuffer | Uint8Array): string => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const b64urlToBytes = (s: string): Uint8Array => {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
};

/** Generate a cryptographically random token (base64url). */
export const randomToken = (bytes = 32): string =>
    bytesToB64url(crypto.getRandomValues(new Uint8Array(bytes)));

export const randomId = (): string => crypto.randomUUID();

/** SHA-256 hex digest — used to hash one-way tokens before storage. */
export async function sha256Hex(input: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * BVN hash. BVN is a sensitive national financial identifier, so we never
 * store the raw value — only a keyed hash (for uniqueness lookup) plus last 4.
 */
export async function hashBVN(bvn: string, key: string): Promise<string> {
    const digest = await crypto.subtle.digest(
        'SHA-256',
        enc.encode(`${key}:${bvn.replace(/\s+/g, '')}`),
    );
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/* ------------------------------ passwords ------------------------------ */

const PBKDF2_PREFIX = 'pbkdf2-sha256';

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
        key,
        256,
    );
    return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToB64url(salt)}$${bytesToB64url(bits)}`;
}

export async function verifyPassword(
    password: string,
    stored: string,
): Promise<boolean> {
    const [scheme, iterStr, saltStr, hashStr] = stored.split('$');
    if (scheme !== PBKDF2_PREFIX || !iterStr || !saltStr || !hashStr) return false;
    const iterations = parseInt(iterStr, 10);
    if (!Number.isFinite(iterations) || iterations < 100_000) return false;
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: b64urlToBytes(saltStr), iterations },
        key,
        256,
    );
    const a = new Uint8Array(bits);
    const b = b64urlToBytes(hashStr);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

/* --------------------------------- JWT --------------------------------- */

interface JwtHeader { alg: 'HS256'; typ: 'JWT' }
export interface AccessTokenPayload {
    sub: string;      // user id
    role: string;
    iat: number;
    exp: number;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
    );
}

const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
};

export async function signJwt(
    payload: Omit<AccessTokenPayload, 'iat' | 'exp'> & { ttlSeconds: number },
    secret: string,
): Promise<string> {
    const { ttlSeconds, ...body } = payload;
    const now = Math.floor(Date.now() / 1000);
    const full: AccessTokenPayload = { ...body, iat: now, exp: now + ttlSeconds };
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const data = `${bytesToB64url(enc.encode(JSON.stringify(header)))}.${bytesToB64url(
        enc.encode(JSON.stringify(full)),
    )}`;
    const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data));
    return `${data}.${bytesToB64url(sig)}`;
}

export async function verifyJwt(
    token: string,
    secret: string,
): Promise<AccessTokenPayload | null> {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const data = `${parts[0]}.${parts[1]}`;
        const sig = await crypto.subtle.verify(
            'HMAC',
            await hmacKey(secret),
            b64urlToBytes(parts[2]),
            enc.encode(data),
        );
        if (!sig) return null;
        const payload = JSON.parse(dec.decode(b64urlToBytes(parts[1]))) as AccessTokenPayload;
        const now = Math.floor(Date.now() / 1000);
        if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
        if (typeof payload.sub !== 'string' || !payload.sub) return null;
        return payload;
    } catch {
        return null;
    }
}

/** Constant-time compare for webhook secrets etc. */
export async function secretEquals(a: string, b: string): Promise<boolean> {
    const da = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(a)));
    const db = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(b)));
    return timingSafeEqual(da, db);
}
