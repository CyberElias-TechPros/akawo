import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { ApiRequestError } from '../api/client';
import type { User, TokenPair } from '../api/types';

export const MOCK_USER: User = {
    id: 'u-1',
    name: 'Chinedu Okafor',
    email: 'chinedu@akawo.dev',
    phone: null,
    emailVerified: true,
    isVerified: true,
    role: 'user',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: null,
};

export const MOCK_TOKENS: TokenPair = {
    accessToken: 'access.test',
    refreshToken: 'refresh.test',
};

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * Install a fetch mock that answers known API routes.
 * Unknown routes resolve to 404 so a bug in a URL surfaces as a failure.
 */
export function mockApi(handlers: Record<string, (url: string) => Response>) {
    const fn = async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
        const url = String(input);
        for (const [pattern, handler] of Object.entries(handlers)) {
            if (url.includes(pattern)) return handler(url);
        }
        return json(404, { success: false, error: { code: 'not_found', message: `no mock for ${url}` } });
    };
    vi.stubGlobal('fetch', fn);
}

export function withAuth(ui: ReactNode, initialPath = '/') {
    return (
        <MemoryRouter initialEntries={[initialPath]}>
            <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
    );
}

export { render, screen, fireEvent, waitFor, ApiRequestError };
