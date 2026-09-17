import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { ApiError } from '../util/http';

const app = new Hono<AppEnv>();

/**
 * TEST-ONLY endpoint (NODE_ENV === 'test', i.e. the vitest Workers pool).
 * Returns 404 everywhere else, including production.
 *
 * Wipes all application data (not the schema) and clears rate-limit state so
 * every test starts from a clean slate regardless of runtime storage sharing.
 */
app.post('/reset', async (c) => {
    if (c.env.LOCAL_DEV !== 'true') throw ApiError.notFound();

    const tables = [
        'payments',
        'contributions',
        'verifications',
        'notifications',
        'emails',
        'audit_logs',
        'refresh_tokens',
        'email_verifications',
        'password_resets',
        'users',
    ];
    await c.env.DB.batch(tables.map((t) => c.env.DB.prepare(`DELETE FROM ${t}`)));

    // Clear rate-limit keys (KV).
    const page = await c.env.CACHE.list();
    const keys = page.keys.map((k) => k.name);
    for (const k of keys) {
        await c.env.CACHE.delete(k);
    }

    return c.json({ success: true, data: { reset: true } });
});

export default app;
