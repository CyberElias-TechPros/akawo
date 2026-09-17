import type { TokenPair } from './types';

/**
 * Minimal fetch client for the Akawo API.
 *
 * - Same-origin `/api` (Vite proxy in dev, Vercel rewrite in prod).
 * - Access token kept in memory; refresh token in localStorage.
 * - On a 401, silently rotates the refresh token once and retries.
 */

const REFRESH_KEY = 'akawo.refreshToken';

let accessToken: string | null = null;

export class ApiRequestError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: string,
        message: string,
    ) {
        super(message);
    }
}

export function getAccessToken(): string | null {
    return accessToken;
}
export function setAccessToken(tok: string | null): void {
    accessToken = tok;
}
export function getRefreshToken(): string | null {
    try {
        return localStorage.getItem(REFRESH_KEY);
    } catch {
        return null;
    }
}
export function storeTokens(tokens: TokenPair | null): void {
    try {
        if (tokens) localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
        else localStorage.removeItem(REFRESH_KEY);
    } catch {
        /* private mode — tokens stay in memory only */
    }
}

async function refreshTokens(): Promise<boolean> {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
        const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) return false;
        const json = (await res.json()) as { success: boolean; data?: { tokens?: TokenPair } };
        if (json.success && json.data?.tokens) {
            accessToken = json.data.tokens.accessToken;
            storeTokens(json.data.tokens);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

interface ApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    form?: FormData;
    auth?: boolean;
}

async function request<T>(path: string, opts: ApiOptions = {}): Promise<T> {
    const doFetch = (withAuth: boolean) => {
        const headers: Record<string, string> = {};
        if (opts.form === undefined && opts.body !== undefined) headers['Content-Type'] = 'application/json';
        if (withAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
        return fetch(`/api${path}`, {
            method: opts.method ?? 'GET',
            headers,
            body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
        });
    };

    let res = await doFetch(true);

    if (res.status === 401 && opts.auth !== false && (await refreshTokens())) {
        res = await doFetch(true);
    }

    const json = (await res.json().catch(() => null)) as
        | { success: boolean; data?: T; error?: { code?: string; message?: string } }
        | null;

    if (!res.ok || !json?.success) {
        throw new ApiRequestError(
            res.status,
            json?.error?.code ?? 'error',
            json?.error?.message ?? `Request failed (${res.status})`,
        );
    }
    return json.data as T;
}

export const api = {
    get: <T>(path: string, opts?: ApiOptions) => request<T>(path, { ...opts, method: 'GET' }),
    post: <T>(path: string, opts?: ApiOptions) => request<T>(path, { ...opts, method: 'POST' }),
    put: <T>(path: string, opts?: ApiOptions) => request<T>(path, { ...opts, method: 'PUT' }),
    del: <T>(path: string, opts?: ApiOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};
