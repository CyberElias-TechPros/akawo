import { SELF } from 'cloudflare:test';
import { beforeEach } from 'vitest';

// Every test starts from a clean slate: wipe D1 data + KV rate-limit state
// via the test-only reset endpoint (404 in dev/prod).
beforeEach(async () => {
    const res = await SELF.fetch(new Request('http://localhost/api/test/reset', { method: 'POST' }));
    if (res.status !== 200) {
        // eslint-disable-next-line no-console
        console.error('test reset failed:', res.status, await res.text());
    }
});

/** Minimal fetch helper for tests (API-only — black box). */
export async function api(
    method: string,
    path: string,
    opts: { body?: unknown; token?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: any; headers: Headers }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers };
    if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
    const res = await SELF.fetch(
        new Request(`http://localhost${path}`, {
            method,
            headers,
            body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        }),
    );
    const body = await res.json().catch(() => null);
    return { status: res.status, body, headers: res.headers };
}

let seq = 0;
export const unique = () => {
    seq += 1;
    return `${Date.now().toString(36)}${seq.toString(36)}`;
};

/** Register a user and return { user, tokens, emailVerifyUrl, credentials }. */
export async function registerUser(over: Partial<{
    name: string;
    email: string;
    password: string;
    bvn: string;
    phone: string;
}> = {}) {
    seq += 1;
    const tag = unique();
    const payload = {
        name: over.name ?? 'Ada Obi',
        email: over.email ?? `ada.${tag}@example.com`,
        password: over.password ?? 'Passw0rd!123',
        bvn: over.bvn ?? `2219${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`,
        ...(over.phone ? { phone: over.phone } : {}),
    };
    const { status, body } = await api('POST', '/api/auth/register', { body: payload });
    if (status !== 201) throw new Error(`register failed: ${status} ${JSON.stringify(body)}`);
    return {
        user: body.data.user,
        tokens: body.data.tokens,
        verifyUrl: body.data.emailVerification?.devUrl as string | undefined,
        ...payload,
    };
}

/** Create the first admin (dev/test bootstrap endpoint) and return a token. */
export async function bootstrapAdmin(over: Partial<{ name: string; email: string; password: string }> = {}) {
    const tag = unique();
    const payload = {
        name: over.name ?? 'Root Admin',
        email: over.email ?? `admin.${tag}@akawo.test`,
        password: over.password ?? 'AdminPass!123',
        bvn: `3219${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`,
    };
    const created = await api('POST', '/api/auth/bootstrap-admin', { body: payload });
    if (created.status !== 201) {
        throw new Error(`bootstrap-admin failed: ${created.status} ${JSON.stringify(created.body)}`);
    }
    const login = await api('POST', '/api/auth/login', {
        body: { email: payload.email, password: payload.password },
    });
    if (login.status !== 200) throw new Error(`admin login failed: ${login.status}`);
    return {
        token: login.body.data.tokens.accessToken,
        refreshToken: login.body.data.tokens.refreshToken,
        admin: login.body.data.user,
        ...payload,
    };
}

/** Login and return a valid access token. */
export async function loginToken(email: string, password: string) {
    const { status, body } = await api('POST', '/api/auth/login', { body: { email, password } });
    if (status !== 200) throw new Error(`login failed: ${status} ${JSON.stringify(body)}`);
    return body.data.tokens as { accessToken: string; refreshToken: string };
}

/** Tiny 1x1 PNG for file uploads. */
export const PNG_BYTES = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
]);

/** Minimal fake mp4 (header only — the API stores bytes, does not transcode). */
export const VIDEO_BYTES = new Uint8Array([
    0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00,
    0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32, 0x00, 0x00, 0x00, 0x14, 0x6d, 0x64, 0x61, 0x74,
]);

export function multipart(fields: Record<string, { content: Blob | string | Uint8Array; name: string; type?: string }>) {
    const fd = new FormData();
    for (const [key, f] of Object.entries(fields)) {
        if (typeof f.content === 'string') fd.append(key, f.content);
        else if (f.content instanceof Blob) fd.append(key, f.content, f.name);
        else fd.append(key, new Blob([f.content as Uint8Array], { type: f.type ?? '' }), f.name);
    }
    return fd;
}
