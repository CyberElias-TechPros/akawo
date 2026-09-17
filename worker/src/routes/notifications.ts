import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv } from '../types';
import { first, all, run } from '../db';
import { ApiError } from '../util/http';
import { nowIso } from '../util/format';
import {  requireUser,
    userOf, } from '../auth';

const app = new Hono<AppEnv>();

interface NotificationRow {
    id: string;
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    read_at: string | null;
    created_at: string;
}

const serialize = (n: NotificationRow) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: !!n.read_at,
    createdAt: n.created_at,
});

app.use('*', requireUser);

app.get('/', async (c) => {
    const user = userOf(c);
    const unreadOnly = c.req.query('unreadOnly') === 'true';
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '30', 10) || 30));
    const rows = await all<NotificationRow>(
        c.env.DB,
        `SELECT * FROM notifications WHERE user_id = ? ${unreadOnly ? 'AND read_at IS NULL' : ''}
         ORDER BY created_at DESC LIMIT ?`,
        user.id,
        limit,
    );
    return c.json({ success: true, data: { notifications: rows.map(serialize) } });
});

app.get('/unread-count', async (c) => {
    const user = userOf(c);
    const row = await first<{ n: number }>(
        c.env.DB,
        `SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`,
        user.id,
    );
    return c.json({ success: true, data: { count: row?.n ?? 0 } });
});

async function owned(c: Context<AppEnv>, id: string): Promise<NotificationRow> {
    const user = userOf(c);
    const row = (await first<NotificationRow>(
        c.env.DB,
        `SELECT * FROM notifications WHERE id = ?`,
        id,
    )) ?? null;
    if (!row) throw ApiError.notFound('Notification not found');
    if (row.user_id !== user.id) throw ApiError.forbidden();
    return row;
}

app.post('/:id/read', async (c) => {
    const row = await owned(c, c.req.param('id'));
    if (!row.read_at) {
        await run(c.env.DB, `UPDATE notifications SET read_at = ? WHERE id = ?`, nowIso(), row.id);
    }
    return c.json({ success: true, data: { read: true } });
});

app.post('/read-all', async (c) => {
    const user = userOf(c);
    await run(
        c.env.DB,
        `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`,
        nowIso(),
        user.id,
    );
    return c.json({ success: true, data: { allRead: true } });
});

export default app;
