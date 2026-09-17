import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from './env';
import type { AppEnv, UserRow } from './types';

export type { UserRow } from './types';
import {
    randomId,
    randomToken,
    sha256Hex,
    signJwt,
    verifyJwt,
} from './util/crypto';
import { first, run } from './db';
import { ApiError } from './util/http';
import { ACCESS_TTL_MIN, REFRESH_TTL_DAYS } from './env';

/** Client-safe projection of a user row (never leaks hashes/BVN). */
export function publicUser(u: UserRow) {
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        bvnLast4: u.bvn_last4,
        emailVerified: !!u.email_verified,
        isVerified: !!u.is_verified,
        role: u.role,
        status: u.status,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
    };
}


/* ----------------------------- token issuing ----------------------------- */

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    accessExpiresInSec: number;
    refreshExpiresInSec: number;
}

export async function issueTokens(
    env: Env,
    user: UserRow,
    familyId?: string,
): Promise<TokenPair> {
    const accessTtl = ACCESS_TTL_MIN(env) * 60;
    const refreshTtl = REFRESH_TTL_DAYS(env) * 24 * 3600;

    const accessToken = await signJwt(
        { sub: user.id, role: user.role, ttlSeconds: accessTtl },
        env.JWT_ACCESS_SECRET,
    );

    const refreshToken = randomToken(32);
    await run(
        env.DB,
        `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        randomId(),
        user.id,
        await sha256Hex(refreshToken),
        familyId ?? randomId(),
        Date.now() + refreshTtl * 1000,
        Date.now(),
    );

    return {
        accessToken,
        refreshToken,
        accessExpiresInSec: accessTtl,
        refreshExpiresInSec: refreshTtl,
    };
}

export async function revokeRefreshToken(env: Env, token: string): Promise<void> {
    if (!token) return;
    await run(
        env.DB,
        `UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`,
        Date.now(),
        await sha256Hex(token),
    );
}

export async function revokeAllUserTokens(env: Env, userId: string): Promise<void> {
    await run(
        env.DB,
        `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
        Date.now(),
        userId,
    );
}

/**
 * Rotate a refresh token. Implements reuse detection: presenting an already
 * rotated/revoked token revokes the whole token family (possible theft).
 */
export async function rotateRefreshToken(
    env: Env,
    token: string,
): Promise<{ user: UserRow; tokens: TokenPair }> {
    const hash = await sha256Hex(token);
    const row = (await first(
        env.DB,
        `SELECT * FROM refresh_tokens WHERE token_hash = ?`,
        hash,
    )) as
        | (UserRow & { id: string; user_id: string; family_id: string; expires_at: number; revoked_at: number | null; replaced_by: string | null })
        | null;

    if (!row) throw ApiError.unauthorized('Session expired, please sign in again');

    if (row.revoked_at !== null) {
        // Reuse of a rotated token — revoke the entire family.
        await run(
            env.DB,
            `UPDATE refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL`,
            Date.now(),
            row.family_id,
        );
        throw ApiError.unauthorized('Session security error, please sign in again');
    }
    if (row.expires_at < Date.now()) {
        throw ApiError.unauthorized('Session expired, please sign in again');
    }

    const user = (await first(
        env.DB,
        `SELECT * FROM users WHERE id = ?`,
        row.user_id,
    )) as UserRow | null;
    if (!user || user.status !== 'active') {
        throw ApiError.unauthorized('Account is not active');
    }

    const tokens = await issueTokens(env, user, row.family_id);
    await run(
        env.DB,
        `UPDATE refresh_tokens SET revoked_at = ?, replaced_by = ? WHERE id = ?`,
        Date.now(),
        (await sha256Hex(tokens.refreshToken)),
        row.id,
    );

    return { user, tokens };
}

/* ------------------------------ route guards ------------------------------ */

async function loadUser(env: Env, c: Context<AppEnv>): Promise<UserRow | null> {
    const header = c.req.header('Authorization') || '';
    if (!header.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    if (!token) return null;
    const payload = await verifyJwt(token, env.JWT_ACCESS_SECRET);
    if (!payload) return null;
    const user = (await first(env.DB, `SELECT * FROM users WHERE id = ?`, payload.sub)) as
        | UserRow
        | null;
    if (!user) return null;
    if (user.status !== 'active') throw ApiError.forbidden('Account is suspended');
    return user;
}

/** Typed accessor for the authenticated user (set by requireUser). */
export const userOf = (c: Context<AppEnv>): UserRow => {
    const u = c.get('user');
    if (!u) throw ApiError.unauthorized();
    return u;
};

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
    const user = await loadUser(c.env, c);
    if (!user) throw ApiError.unauthorized();
    c.set('user', user);
    await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
    const user = c.get('user');
    if (!user) throw ApiError.unauthorized();
    if (user.role !== 'admin') throw ApiError.forbidden('Admin access required');
    await next();
};
