import type { Env } from './env';

/** A row from the `users` table (password/bvn hashes excluded from publicUser). */
export interface UserRow {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    password_hash: string;
    bvn_hash: string;
    bvn_last4: string;
    email_verified: number;
    is_verified: number;
    role: 'user' | 'admin';
    status: 'active' | 'suspended';
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
}

/** Hono environment: Cloudflare bindings + per-request variables. */
export type AppEnv = {
    Bindings: Env;
    Variables: {
        user?: UserRow;
        requestId?: string;
    };
};
